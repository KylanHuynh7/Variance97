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
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_player_log import PLAYERS, SUBJECT, clean_log_path  # type: ignore  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data"
OUT_PATH = REPO_ROOT / "web" / "public" / "data.json"

NHL_CONTEXTS = ["regular_season", "first_round", "second_round",
                "conf_finals", "stanley_cup_finals"]

NUMERIC_FEATURES = [
    "game_number", "is_elimination_game", "is_back_to_back",
    "rest_days", "rolling_pts_5", "opp_ga_per_game", "opp_goalie_sv_pct",
]
CATEGORICAL_FEATURES = ["game_context"]

def _tracked_files() -> dict[str, str]:
    """Files the Pipeline Status page reports on, derived from the registry.

    Listing them by hand meant a peer added to the registry stayed invisible
    on the status page -- the one page whose job is to show what the pipeline
    actually maintains.
    """
    files: dict[str, str] = {}
    for key, player in PLAYERS.items():
        files[f"{player.short_name} clean (analysis input)"] = f"{key}_game_log_clean.csv"
    for key, player in PLAYERS.items():
        files[f"{player.short_name} NHL source (API-derived)"] = f"{key}_nhl_log.csv"
    files["International games (manual entry)"] = "international_games.csv"
    files["Opponent team stats (NHL standings)"] = "opponent_team_stats.csv"
    files["Opposing goalie game logs (NHL API)"] = "goalie_game_logs.csv"
    return files


TRACKED_FILES = _tracked_files()

# Metrics the peer explorer lets a reader switch between.
PEER_METRICS = ["points", "goals", "assists", "plus_minus"]

GAME_COLUMNS = [
    "date", "opponent", "goals", "assists", "points", "plus_minus",
    "SOG", "TOI", "result", "team_score", "opp_score", "game_number",
    "game_context", "season", "is_elimination_game", "rest_days",
    "is_back_to_back", "rolling_pts_5", "opp_ga_per_game",
    "opp_goalie_name", "opp_goalie_sv_pct",
]


def _clean(value):
    """JSON-safe scalar: NaN/NaT -> None, numpy scalars -> Python scalars."""
    # pd.NaT is not a float and not a Timestamp, so it slipped past both
    # branches below and reached json.dumps as a NaTType, which raises.
    if value is None or value is pd.NaT or (isinstance(value, float) and math.isnan(value)):
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
    required = ["points", "opp_ga_per_game", "rest_days", "rolling_pts_5",
                "opp_goalie_sv_pct"]
    df = df.dropna(subset=required).reset_index(drop=True)
    df["game_number"] = df["game_number"].fillna(0).astype(int)
    df["is_elimination_game"] = df["is_elimination_game"].astype(int)
    df["is_back_to_back"] = df["is_back_to_back"].astype(int)

    # Pin the dummy encoding to NHL_CONTEXTS so the reference level is
    # regular_season, deliberately and permanently.
    #
    # Plain get_dummies(drop_first=True) drops whichever category sorts first
    # among those *present in the data*, which was conf_finals. Every context
    # coefficient was therefore measured against the Conference Finals while
    # the page read as though it were measured against the regular season --
    # and had a future refresh ever dropped the conf_finals rows, the baseline
    # would have silently moved again. Declaring the categories fixes both:
    # the columns no longer depend on which contexts happen to be present.
    df[CATEGORICAL_FEATURES[0]] = pd.Categorical(
        df[CATEGORICAL_FEATURES[0]], categories=NHL_CONTEXTS
    )
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
        # The dropped dummy category. Every game_context_* coefficient is
        # measured against this level, so the page has to be able to say so.
        "reference_context": NHL_CONTEXTS[0],
        "intercept": round(float(ridge.intercept_), 6),
        "scaler_mean": [round(float(v), 6) for v in scaler.mean_],
        "scaler_scale": [round(float(v), 6) for v in scaler.scale_],
        "coefficients": coefficients,
        "n_train": int(len(X)),
        "games": [
            {
                "date": df_used.iloc[i]["date"].strftime("%Y-%m-%d"),
                "opponent": df_used.iloc[i]["opponent"],
                "opp_goalie_name": _clean(df_used.iloc[i].get("opp_goalie_name")),
                "game_context": df_used.iloc[i]["game_context"],
                "points": int(df_used.iloc[i]["points"]),
                "x": [round(float(v), 6) for v in X.iloc[i].values],
            }
            for i in range(len(X))
        ],
    }


def _last_changed(path: Path) -> pd.Timestamp:
    """When this file's contents last changed.

    File mtimes can't answer that: a git checkout stamps every file with the
    checkout time, so on the daily GitHub Action every file would read as
    refreshed that minute. A file with no uncommitted changes is dated by the
    last commit that touched it instead. A file that *does* have uncommitted
    changes -- which is what a pipeline run that found new games produces --
    was changed just now, and its mtime says so.
    """
    rel = str(path.relative_to(REPO_ROOT))
    try:
        dirty = subprocess.run(
            ["git", "status", "--porcelain", "--", rel],
            cwd=REPO_ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
        if not dirty:
            committed = subprocess.run(
                ["git", "log", "-1", "--format=%ct", "--", rel],
                cwd=REPO_ROOT, capture_output=True, text=True, check=True,
            ).stdout.strip()
            if committed:
                return pd.Timestamp(int(committed), unit="s", tz="UTC")
    except (OSError, subprocess.CalledProcessError):
        pass  # no git available: mtime is the best there is
    return pd.Timestamp(path.stat().st_mtime, unit="s", tz="UTC")


def build_pipeline_section(mcdavid: pd.DataFrame) -> dict:
    files = []
    for label, name in TRACKED_FILES.items():
        path = DATA_DIR / name
        if path.exists():
            stat = path.stat()
            refreshed = _last_changed(path).tz_convert("US/Pacific")
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


def _series_in_context(df: pd.DataFrame, context: str) -> list[dict]:
    """One row per playoff series a player played in this context.

    A series is a (season, context) pair -- a player reaches a given round at
    most once per season -- so this is what lets the page say "Eichel's Finals
    sample is two series against two opponents" rather than just "n=11".
    """
    rows = df[df["game_context"] == context]
    out = []
    for season, grp in rows.groupby("season"):
        wins = int((grp["result"] == "W").sum())
        losses = int((grp["result"] == "L").sum())
        out.append({
            "season": season,
            # One opponent per series; mode() guards a stray mislabelled row.
            "opponent": grp["opponent"].mode().iat[0],
            "games": int(len(grp)),
            "points_per_game": round(float(grp["points"].mean()), 4),
            "record": f"{wins}-{losses}",
            "won": wins > losses,
        })
    return sorted(out, key=lambda r: r["season"])


def build_players_section() -> list[dict]:
    """Per-player context aggregates for the peer comparison.

    Aggregates rather than full game logs: the peer page needs means, counts
    and the Finals series breakdown, and shipping six complete logs would
    multiply the bundle for numbers no page reads game-by-game. The subject's
    own log is still exported in full for the other pages.
    """
    players = []
    for key, player in PLAYERS.items():
        path = clean_log_path(key, DATA_DIR)
        if not path.exists():
            print(f"  skip {player.name}: {path.name} missing")
            continue
        df = load_games(path.name)
        nhl = df[df["game_context"].isin(NHL_CONTEXTS)]

        means = {}
        for metric in PEER_METRICS:
            means[metric] = [
                round(float(nhl[nhl["game_context"] == c][metric].mean()), 4)
                if (nhl["game_context"] == c).any() else None
                for c in NHL_CONTEXTS
            ]
        counts = [int((nhl["game_context"] == c).sum()) for c in NHL_CONTEXTS]

        rs = nhl[nhl["game_context"] == "regular_season"]["points"]
        scf = nhl[nhl["game_context"] == "stanley_cup_finals"]["points"]
        drop = (round(float(scf.mean() - rs.mean()), 4)
                if len(scf) and len(rs) else None)

        players.append({
            "key": key,
            "name": player.name,
            "short_name": player.short_name,
            "role": player.role,
            "note": player.note,
            "counts": counts,
            "means": means,
            # None where a player has no Finals appearance in the window --
            # which is a fact about the peer group, not a missing value to
            # paper over. Two of the five peers are in that position.
            "scf_drop": drop,
            "scf_games": int(len(scf)),
            "scf_series": _series_in_context(nhl, "stanley_cup_finals"),
        })
    return players


def build_bundle() -> dict:
    mcdavid = load_games("mcdavid_game_log_clean.csv")
    mackinnon = load_games("mackinnon_game_log_clean.csv")
    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "mcdavid": games_to_records(mcdavid),
        "mackinnon": games_to_records(mackinnon),
        "contexts": NHL_CONTEXTS,
        "players": build_players_section(),
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
