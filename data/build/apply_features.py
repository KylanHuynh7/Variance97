"""
Recompute is_elimination_game by rule + add Phase 3 ML features for a player log.

Concatenates an optional international-games manual-entry CSV before computing
features so Four Nations / Olympics rows always carry the rule-derived
is_elimination_game flag and rolling-points context.

is_elimination_game rule:
  - NHL playoff series: True if opponent already has 3 series wins entering
    this game (next loss eliminates the player's team). Walks each
    (season, round) in game_number order using W/L from the result column.
  - International knockout games (quarterfinals, semifinals, finals): always
    True -- a single loss ends the run.
  - Regular season, exhibition, group stage: always False.

ML features:
  - rest_days        : days since last game in the dataset (NaN for first row).
  - is_back_to_back  : rest_days <= 1
  - rolling_pts_5    : trailing 5-game points avg, shifted to avoid leakage.
  - opp_ga_per_game  : opponent team's season GA/game from team_stats. NaN
                       for international opponents (no NHL standings).

Idempotent: rebuilds all derived columns from scratch each call.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

INTL_KNOCKOUT_CONTEXTS = {
    "four_nations_faceoff_finals",
    "olympics_quarterfinals",
    "olympics_semifinals",
    "olympics_finals",
}
NHL_PLAYOFF_CONTEXTS = {
    "first_round", "second_round", "conf_finals", "stanley_cup_finals",
}


def compute_elimination(df: pd.DataFrame) -> pd.Series:
    flags = pd.Series(False, index=df.index)

    # International knockout: single-loss elimination.
    flags |= df["game_context"].isin(INTL_KNOCKOUT_CONTEXTS)

    # NHL playoffs: walk each series in order.
    nhl_mask = df["game_context"].isin(NHL_PLAYOFF_CONTEXTS)
    nhl = df[nhl_mask].copy()
    for (_, _), grp in nhl.groupby(["season", "game_context"]):
        grp = grp.sort_values("game_number")
        opp_wins = 0
        for idx, row in grp.iterrows():
            if opp_wins >= 3:
                flags.loc[idx] = True
            if str(row["result"]).strip() == "L":
                opp_wins += 1
    return flags


def add_ml_features(df: pd.DataFrame, team_stats: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values("date").reset_index(drop=True)

    df["rest_days"] = df["date"].diff().dt.days
    df["is_back_to_back"] = (df["rest_days"] <= 1).fillna(False)

    # Trailing 5-game points avg shifted by 1 so the value reflects form
    # entering the game (no leakage from the current game).
    df["rolling_pts_5"] = df["points"].rolling(window=5, min_periods=1).mean().shift(1)

    # Drop a stale opp_ga_per_game column if it exists (idempotent re-run).
    df = df.drop(columns=["opp_ga_per_game"], errors="ignore")
    df = df.merge(
        team_stats[["season", "team_abbrev", "ga_per_game"]].rename(
            columns={"team_abbrev": "opponent", "ga_per_game": "opp_ga_per_game"}
        ),
        on=["season", "opponent"], how="left",
    )
    return df


def apply_features(
    nhl_source_path: Path,
    team_stats_path: Path,
    out_path: Path,
    international_path: Path | None = None,
) -> pd.DataFrame:
    """Build the merged + featured output from NHL source + manual international.

    Reads nhl_source_path (API-derived NHL games, no derived columns),
    optionally concatenates international_path (manual-entry CSV, NHL API
    doesn't cover Four Nations / Olympics), recomputes is_elimination_game
    by rule, joins opponent strength from team_stats_path, and writes the
    merged result with all derived columns to out_path.

    Idempotent: out_path is regenerated from scratch each call. Duplicates
    on date are removed (last write wins) to keep multiple runs safe.
    """
    df = pd.read_csv(nhl_source_path)

    if international_path is not None and Path(international_path).exists():
        intl = pd.read_csv(international_path)
        if not intl.empty:
            df = pd.concat([df, intl], ignore_index=True, sort=False)

    df = df.drop_duplicates(subset=["date"], keep="last").reset_index(drop=True)
    df["result"] = df["result"].astype(str).str.strip()
    df["date"] = pd.to_datetime(df["date"])

    df["is_elimination_game"] = compute_elimination(df)

    team_stats = pd.read_csv(team_stats_path)
    df = add_ml_features(df, team_stats)

    elim = df[df["is_elimination_game"]]
    print(f"Total rows: {len(df)}  (elimination games: {len(elim)})")
    print("Feature coverage:")
    print(f"  rest_days non-null:       {df['rest_days'].notna().sum()}/{len(df)}")
    print(f"  rolling_pts_5 non-null:   {df['rolling_pts_5'].notna().sum()}/{len(df)}")
    print(f"  opp_ga_per_game non-null: {df['opp_ga_per_game'].notna().sum()}/{len(df)}")

    df.to_csv(out_path, index=False)
    print(f"Wrote -> {out_path}")
    return df


if __name__ == "__main__":
    data_dir = Path(__file__).resolve().parent.parent
    apply_features(
        nhl_source_path=data_dir / "mcdavid_nhl_log.csv",
        team_stats_path=data_dir / "opponent_team_stats.csv",
        international_path=data_dir / "international_games.csv",
        out_path=data_dir / "mcdavid_game_log_clean.csv",
    )
