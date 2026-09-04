"""
Export the web bundle consumed by the static dashboard in `web/`.

The Streamlit app (`app/`) computes everything at request time: CSV reads,
groupby aggregations, and a Ridge fit. The static site can't run Python, so
this script does all of that once at build time and writes the result to
`web/public/data.json`.

Run it after the Phase 4 pipeline (`scripts/run_update.sh` does both), then
commit the JSON — Vercel redeploys on push.

The model section mirrors `app/components/model.py` exactly (same feature
list, same _prepare filtering, same Ridge(alpha=1.0) on standardized
features). It's duplicated rather than imported because that module depends
on streamlit. `--verify` checks the two stay in agreement.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data"
OUT_PATH = REPO_ROOT / "web" / "public" / "data.json"

NHL_CONTEXTS = ["regular_season", "first_round", "second_round",
                "conf_finals", "stanley_cup_finals"]

NUMERIC_FEATURES = [
    "game_number", "is_elimination_game", "is_back_to_back",
    "rest_days", "rolling_pts_5", "opp_ga_per_game",
]
CATEGORICAL_FEATURES = ["game_context"]

# Mirrors the `files` dict on the Streamlit Pipeline Status page.
TRACKED_FILES = {
    "McDavid clean (analysis input)": "mcdavid_game_log_clean.csv",
    "MacKinnon clean (analysis input)": "mackinnon_game_log_clean.csv",
    "McDavid NHL source (API-derived)": "mcdavid_nhl_log.csv",
    "MacKinnon NHL source (API-derived)": "mackinnon_nhl_log.csv",
    "International games (manual entry)": "international_games.csv",
    "Opponent team stats (NHL standings)": "opponent_team_stats.csv",
}

GAME_COLUMNS = [
    "date", "opponent", "goals", "assists", "points", "plus_minus",
    "SOG", "TOI", "result", "team_score", "opp_score", "game_number",
    "game_context", "season", "is_elimination_game", "rest_days",
    "is_back_to_back", "rolling_pts_5", "opp_ga_per_game",
]


def _clean(value):
    """JSON-safe scalar: NaN/NaT -> None, numpy scalars -> Python scalars."""
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return None if math.isnan(float(value)) else round(float(value), 6)
    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d")
    return value


def load_games(name: str) -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / name)
    df["date"] = pd.to_datetime(df["date"])
    df["result"] = df["result"].astype(str).str.strip()
    return df


def games_to_records(df: pd.DataFrame) -> list[dict]:
    df = df.sort_values("date")
    cols = [c for c in GAME_COLUMNS if c in df.columns]
    return [
        {c: _clean(row[c]) for c in cols}
        for _, row in df[cols].iterrows()
    ]


def prepare(df: pd.DataFrame):
    """Identical to app/components/model.py::_prepare."""
    df = df[df["game_context"].isin(NHL_CONTEXTS)].copy()
    required = ["points", "opp_ga_per_game", "rest_days", "rolling_pts_5"]
    df = df.dropna(subset=required).reset_index(drop=True)
    df["game_number"] = df["game_number"].fillna(0).astype(int)
    df["is_elimination_game"] = df["is_elimination_game"].astype(int)
    df["is_back_to_back"] = df["is_back_to_back"].astype(int)

    X = pd.concat([
        df[NUMERIC_FEATURES].astype(float),
        pd.get_dummies(df[CATEGORICAL_FEATURES], drop_first=True).astype(float),
    ], axis=1)
    y = df["points"].astype(float)
    return X, y, df


def build_model_section(mcdavid: pd.DataFrame) -> dict:
    """Fit the Ridge model and export everything the browser needs to
    reproduce per-game contributions without sklearn.

    For Ridge on standardized features:
        pred = intercept + sum_i coef_i * (x_i - mean_i) / scale_i
    so shipping mean/scale/coef/intercept plus the raw feature matrix is
    enough for the client to compute any game's decomposition in JS.
    """
    X, y, df_used = prepare(mcdavid)

    pipe = Pipeline([
        ("scale", StandardScaler()),
        ("ridge", Ridge(alpha=1.0, random_state=42)),
    ])
    pipe.fit(X, y)

    scaler: StandardScaler = pipe.named_steps["scale"]
    ridge: Ridge = pipe.named_steps["ridge"]

    coefficients = [
        {"feature": f, "coefficient": round(float(c), 6)}
        for f, c in zip(X.columns, ridge.coef_)
    ]
    coefficients.sort(key=lambda d: abs(d["coefficient"]), reverse=True)

    return {
        "feature_names": list(X.columns),
        "intercept": round(float(ridge.intercept_), 6),
        "scaler_mean": [round(float(v), 6) for v in scaler.mean_],
        "scaler_scale": [round(float(v), 6) for v in scaler.scale_],
        "coefficients": coefficients,
        "n_train": int(len(X)),
        "games": [
            {
                "date": df_used.iloc[i]["date"].strftime("%Y-%m-%d"),
                "opponent": df_used.iloc[i]["opponent"],
                "game_context": df_used.iloc[i]["game_context"],
                "points": int(df_used.iloc[i]["points"]),
                "x": [round(float(v), 6) for v in X.iloc[i].values],
            }
            for i in range(len(X))
        ],
    }


def build_pipeline_section(mcdavid: pd.DataFrame) -> dict:
    files = []
    for label, name in TRACKED_FILES.items():
        path = DATA_DIR / name
        if path.exists():
            stat = path.stat()
            refreshed = (pd.Timestamp(stat.st_mtime, unit="s", tz="UTC")
                         .tz_convert("US/Pacific"))
            files.append({
                "label": label,
                "path": f"data/{name}",
                "last_refreshed": refreshed.strftime("%Y-%m-%d %H:%M %Z"),
                "size_kb": round(stat.st_size / 1024, 1),
            })
        else:
            files.append({
                "label": label, "path": f"data/{name}",
                "last_refreshed": "(missing)", "size_kb": 0,
            })

    per_season = (mcdavid.groupby(["season", "game_context"])
                  .size().reset_index(name="games"))

    return {
        "files": files,
        "total_games": int(len(mcdavid)),
        "latest_game": mcdavid["date"].max().strftime("%Y-%m-%d"),
        "seasons": int(mcdavid["season"].nunique()),
        "per_season": [
            {"season": r["season"], "game_context": r["game_context"],
             "games": int(r["games"])}
            for _, r in per_season.iterrows()
        ],
    }


def build_bundle() -> dict:
    mcdavid = load_games("mcdavid_game_log_clean.csv")
    mackinnon = load_games("mackinnon_game_log_clean.csv")
    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "mcdavid": games_to_records(mcdavid),
        "mackinnon": games_to_records(mackinnon),
        "model": build_model_section(mcdavid),
        "pipeline": build_pipeline_section(mcdavid),
    }


def verify_against_streamlit_model(bundle: dict) -> None:
    """Confirm the duplicated training code still matches app/components/model.py."""
    import sys
    sys.path.insert(0, str(REPO_ROOT / "app"))
    from components import model as st_model  # noqa: E402  (needs streamlit installed)

    mcdavid = load_games("mcdavid_game_log_clean.csv")
    X_ref, y_ref, _ = st_model._prepare(mcdavid)
    X_ours, y_ours, _ = prepare(mcdavid)

    assert list(X_ref.columns) == list(X_ours.columns), "feature columns diverged"
    assert np.allclose(X_ref.values, X_ours.values), "feature matrix diverged"
    assert np.allclose(y_ref.values, y_ours.values), "target diverged"

    pipe = Pipeline([("scale", StandardScaler()),
                     ("ridge", Ridge(alpha=1.0, random_state=42))])
    pipe.fit(X_ref, y_ref)
    ref_coef = pipe.named_steps["ridge"].coef_
    ours = {c["feature"]: c["coefficient"] for c in bundle["model"]["coefficients"]}
    for name, c in zip(X_ref.columns, ref_coef):
        assert abs(ours[name] - float(c)) < 1e-5, f"coefficient diverged: {name}"
    assert abs(bundle["model"]["intercept"]
               - float(pipe.named_steps["ridge"].intercept_)) < 1e-5
    print("verify: export matches app/components/model.py")


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true",
                        help="cross-check the fit against the Streamlit model module")
    args = parser.parse_args()

    bundle = build_bundle()
    if args.verify:
        verify_against_streamlit_model(bundle)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(bundle, separators=(",", ":")))

    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"wrote {OUT_PATH.relative_to(REPO_ROOT)} "
          f"({size_kb:.0f} KB) — {len(bundle['mcdavid'])} McDavid games, "
          f"{len(bundle['mackinnon'])} MacKinnon games, "
          f"model trained on {bundle['model']['n_train']}")


if __name__ == "__main__":
    main()
