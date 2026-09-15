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

ML features (all reset at the season boundary, so the offseason never counts
as rest or as recent form):
  - rest_days        : days since the previous game *this season* (NaN for a
                       season's first game).
  - is_back_to_back  : rest_days <= 1
  - rolling_pts_5    : trailing 5-game points avg within the season, shifted
                       to avoid leakage (NaN for a season's first game).
  - opp_ga_per_game  : opponent team's season GA/game from team_stats. NaN
                       for international opponents (no NHL standings).
  - opp_goalie_sv_pct: the opposing starter's save% over the 365 days before
                       the game (regular season and playoffs, never the game
                       itself), shrunk toward the league rate over the same
                       window. NaN for international rows (no boxscore).

Idempotent: rebuilds all derived columns from scratch each call.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

# A year, not a season-to-date, so an October start still has a full body of
# work behind it -- and the window never reaches the game being predicted.
GOALIE_WINDOW_DAYS = 365

# Save percentage is among the noisiest rates in hockey: a hot 15 starts says
# little. Each goalie's window is blended with this many shots at the league
# rate, so a backup with 200 shots sits near average and a starter with 1,800
# is mostly himself. Not tuned on the outcome; see the sensitivity check in
# notebook 03 before changing it.
GOALIE_PRIOR_SHOTS = 1000

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

    # Both of these reset at the season boundary.
    #
    # Computing them across the whole career log let the offseason in: a
    # season opener scored a "rest" of 107-150 days against an in-season
    # median of 2, and five such rows out of 448 pushed the standard
    # deviation from 1.27 to 11.69. Because the model standardizes its
    # features, that made one unit of rest_days about 9x too wide and
    # flattened the coefficient toward zero -- which the model page then
    # reported as rest not mattering. The same gap let rolling_pts_5 carry
    # form from June's playoffs into October's opener.
    #
    # A season's first game now has no prior game to measure from, so both
    # come out NaN and _prepare drops the row. That is the honest answer:
    # "days since the last game" is undefined for the first one.
    df["rest_days"] = df.groupby("season")["date"].diff().dt.days
    df["is_back_to_back"] = (df["rest_days"] <= 1).fillna(False)

    # Trailing 5-game points avg shifted by 1 so the value reflects form
    # entering the game (no leakage from the current game).
    df["rolling_pts_5"] = df.groupby("season")["points"].transform(
        lambda s: s.rolling(window=5, min_periods=1).mean().shift(1)
    )

    # Drop a stale opp_ga_per_game column if it exists (idempotent re-run).
    df = df.drop(columns=["opp_ga_per_game"], errors="ignore")
    df = df.merge(
        team_stats[["season", "team_abbrev", "ga_per_game"]].rename(
            columns={"team_abbrev": "opponent", "ga_per_game": "opp_ga_per_game"}
        ),
        on=["season", "opponent"], how="left",
    )
    return df


def _window_sums(dates: np.ndarray, cum: np.ndarray, when: np.ndarray, days: int) -> np.ndarray:
    """Sum of a per-game quantity over games in [when - days, when).

    `dates` is sorted and `cum` is its cumulative sum with a leading zero, so
    each window is two binary searches. side="left" on the upper bound is what
    keeps a game out of its own feature.
    """
    lo = np.searchsorted(dates, when - np.timedelta64(days, "D"), side="left")
    hi = np.searchsorted(dates, when, side="left")
    return cum[hi] - cum[lo]


def add_goalie_feature(
    df: pd.DataFrame,
    goalie_logs: pd.DataFrame,
    window_days: int = GOALIE_WINDOW_DAYS,
    prior_shots: float = GOALIE_PRIOR_SHOTS,
) -> pd.DataFrame:
    df = df.drop(columns=["opp_goalie_sv_pct"], errors="ignore")
    if "opp_goalie_id" not in df.columns:
        df["opp_goalie_sv_pct"] = np.nan
        return df

    logs = goalie_logs.copy()
    logs["date"] = pd.to_datetime(logs["date"])
    logs = logs.drop_duplicates(subset=["goalie_id", "date"]).sort_values("date")

    def cumulative(frame: pd.DataFrame):
        dates = frame["date"].to_numpy(dtype="datetime64[ns]")
        shots = np.concatenate([[0], np.cumsum(frame["shots_against"].to_numpy())])
        goals = np.concatenate([[0], np.cumsum(frame["goals_against"].to_numpy())])
        return dates, shots, goals

    # League rate over the same window, pooled across every logged goalie.
    l_dates, l_shots, l_goals = cumulative(logs)
    by_goalie = {int(g): cumulative(f) for g, f in logs.groupby("goalie_id")}

    ids = pd.to_numeric(df["opp_goalie_id"], errors="coerce")
    out = np.full(len(df), np.nan)
    missing: set[int] = set()
    for i, (gid, when) in enumerate(zip(ids, df["date"])):
        if pd.isna(gid):
            continue
        gid = int(gid)
        if gid not in by_goalie:
            missing.add(gid)
            continue
        t = np.array([np.datetime64(when, "ns")])
        g_dates, g_shots, g_goals = by_goalie[gid]
        shots = _window_sums(g_dates, g_shots, t, window_days)[0]
        saves = shots - _window_sums(g_dates, g_goals, t, window_days)[0]
        league_shots = _window_sums(l_dates, l_shots, t, window_days)[0]
        league_goals = _window_sums(l_dates, l_goals, t, window_days)[0]
        if league_shots == 0:
            continue  # no logged games at all in the window: undefined, not average
        league_rate = 1 - league_goals / league_shots
        out[i] = (saves + prior_shots * league_rate) / (shots + prior_shots)

    # A starter with no log at all would silently read as league average.
    # That is a fetch that didn't happen, not a goalie with no history.
    if missing:
        raise ValueError(
            f"no game log for {len(missing)} opposing goalie(s): "
            + ", ".join(str(g) for g in sorted(missing)[:10])
            + " -- run update_all.py so fetch_goalie_logs picks them up"
        )
    df["opp_goalie_sv_pct"] = out
    return df


def apply_features(
    nhl_source_path: Path,
    team_stats_path: Path,
    out_path: Path,
    international_path: Path | None = None,
    goalie_logs_path: Path | None = None,
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

    # Dedup guards against a double concat, but a *genuine* collision -- an
    # NHL game and an international game on the same date -- would silently
    # delete the NHL row, since the international rows are concatenated last.
    # That is a data error worth stopping for, not absorbing.
    dupes = df[df.duplicated(subset=["date"], keep=False)]
    if len(dupes):
        conflicting = dupes.groupby("date")["game_context"].nunique()
        conflicting = conflicting[conflicting > 1]
        if len(conflicting):
            raise ValueError(
                "two different games share a date, so one would be dropped: "
                + ", ".join(str(d) for d in conflicting.index)
            )
    df = df.drop_duplicates(subset=["date"], keep="last").reset_index(drop=True)
    df["result"] = df["result"].astype(str).str.strip()
    df["date"] = pd.to_datetime(df["date"])

    df["is_elimination_game"] = compute_elimination(df)

    team_stats = pd.read_csv(team_stats_path)
    df = add_ml_features(df, team_stats)

    if goalie_logs_path is not None and Path(goalie_logs_path).exists():
        df = add_goalie_feature(df, pd.read_csv(goalie_logs_path))
    else:
        df["opp_goalie_sv_pct"] = np.nan
    if "opp_goalie_id" in df.columns:
        df["opp_goalie_id"] = pd.to_numeric(df["opp_goalie_id"]).astype("Int64")

    elim = df[df["is_elimination_game"]]
    print(f"Total rows: {len(df)}  (elimination games: {len(elim)})")
    print("Feature coverage:")
    print(f"  rest_days non-null:         {df['rest_days'].notna().sum()}/{len(df)}")
    print(f"  rolling_pts_5 non-null:     {df['rolling_pts_5'].notna().sum()}/{len(df)}")
    print(f"  opp_ga_per_game non-null:   {df['opp_ga_per_game'].notna().sum()}/{len(df)}")
    print(f"  opp_goalie_sv_pct non-null: {df['opp_goalie_sv_pct'].notna().sum()}/{len(df)}")

    df.to_csv(out_path, index=False)
    print(f"Wrote -> {out_path}")
    return df


if __name__ == "__main__":
    data_dir = Path(__file__).resolve().parent.parent
    apply_features(
        nhl_source_path=data_dir / "mcdavid_nhl_log.csv",
        team_stats_path=data_dir / "opponent_team_stats.csv",
        goalie_logs_path=data_dir / "goalie_game_logs.csv",
        international_path=data_dir / "international_games.csv",
        out_path=data_dir / "mcdavid_game_log_clean.csv",
    )
