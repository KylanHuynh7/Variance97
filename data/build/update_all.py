"""
Variance97 data pipeline orchestrator.

End-to-end refresh:
  1. For each player in fetch_player_log.PLAYERS, find the latest game date
     in their NHL source CSV (the cursor) and fetch any newer games.
  2. Boxscore-enrich new rows with result / team_score / opp_score.
  3. Append new rows to the player's NHL source CSV.
  4. Refresh opponent_team_stats.csv from current standings.
  5. Run apply_features for every player -- computing is_elimination_game /
     rest_days / is_back_to_back / rolling_pts_5 / opp_ga_per_game -- and
     write each merged clean CSV. Only the subject concatenates
     international_games.csv; the NHL API doesn't cover those tournaments and
     no peer has manual rows.

The player list is the registry, not a hardcoded pair, so adding a peer is a
registry entry and nothing else.

Idempotent: running with no new games appends nothing. Safe to cron.

Usage:
  python -m data.build.update_all              # refresh every registry player
  python data/build/update_all.py              # equivalent
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

# Allow running directly without package install.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from apply_features import apply_features  # type: ignore
from fetch_boxscores import enrich_rows  # type: ignore
from fetch_player_log import (  # type: ignore
    PLAYERS,
    SUBJECT,
    Player,
    clean_log_path,
    fetch_player_log,
    nhl_log_path,
)
from fetch_team_stats import build_team_stats  # type: ignore
from seasons import current_season_start_year, season_ids, season_label  # type: ignore

DATA_DIR = Path(__file__).resolve().parent.parent

# Canonical source-log schema. An existing file defines its own column order
# and that wins; this is what a cold start writes, so a peer added today gets
# the same columns as McDavid's log rather than whatever the fetcher happened
# to return (which also carries gameId and home_away, used during enrichment
# and not part of the stored schema).
SOURCE_COLUMNS = [
    "date", "opponent", "goals", "assists", "points", "plus_minus",
    "SOG", "TOI", "result", "team_score", "opp_score", "game_number",
    "game_context", "season",
]


def _refresh_player(player: Player, source_csv: Path, rebuild: bool = False) -> int:
    """Fetch any games newer than what's in source_csv, boxscore-enrich, append.

    With rebuild=True the cursor is ignored and every game in the window is
    re-fetched and re-enriched, replacing the stored rows. The incremental path
    only ever looks at dates newer than the newest it already has, so a row
    that was written wrong stays wrong forever -- which is exactly what had
    happened to McDavid's log, whose oldest rows predate this pipeline.
    """
    print(f"\n[{player.name}] {'rebuilding' if rebuild else 'refreshing'} {source_csv.name}")

    if rebuild and source_csv.exists():
        existing = pd.read_csv(source_csv)
        print(f"  existing rows: {len(existing)}  (ignoring cursor, re-fetching all)")
        existing = pd.DataFrame()
        existing_dates = set()
    elif source_csv.exists():
        existing = pd.read_csv(source_csv)
        existing_dates = set(existing["date"].astype(str)) if len(existing) else set()
        latest = max(existing_dates) if existing_dates else None
        print(f"  existing rows: {len(existing)}  (latest: {latest})")
    else:
        existing = pd.DataFrame()
        existing_dates = set()
        print("  existing rows: 0  (cold start)")

    # Rows whose boxscore enrichment failed on an earlier run. Without this,
    # a single network blip during enrichment was permanent: the row landed
    # with a null result, its date joined existing_dates, and it was filtered
    # out before enrichment on every subsequent run. Downstream that null
    # becomes the string "None", which compute_elimination doesn't count as a
    # loss -- so one blip quietly corrupts a whole series' elimination flags.
    stale_dates: set[str] = set()
    if len(existing) and "result" in existing.columns:
        stale = existing[existing["result"].isna()]
        stale_dates = set(stale["date"].astype(str))

    # Fetch all configured seasons; we'll filter to truly new games below.
    fetched = fetch_player_log(player, seasons=season_ids())

    new_rows = [r for r in fetched if r["date"] not in existing_dates]
    retry_rows = [r for r in fetched if r["date"] in stale_dates]

    if not new_rows and not retry_rows:
        print("  no new games. up to date.")
        return 0

    if retry_rows:
        print(f"  retrying {len(retry_rows)} row(s) with missing boxscore data")
    print(f"  found {len(new_rows)} new game(s); enriching boxscores...")
    # keep="last" on the merge below lets a retried row replace the stale one.
    added = len(new_rows)
    batch = enrich_rows(new_rows + retry_rows)

    new_df = pd.DataFrame(batch)
    # Drop columns that aren't part of the source schema (e.g. gameId,
    # home_away if not used downstream). Keep the source schema canonical.
    source_cols = list(existing.columns) if len(existing) else SOURCE_COLUMNS
    for col in source_cols:
        if col not in new_df.columns:
            new_df[col] = None
    new_df = new_df[source_cols]

    merged = pd.concat([existing, new_df], ignore_index=True, sort=False)
    merged = merged.drop_duplicates(subset=["date"], keep="last").reset_index(drop=True)
    merged.to_csv(source_csv, index=False)
    print(f"  wrote {len(merged)} rows -> {source_csv.name} (+{added})")

    still_missing = int(merged["result"].isna().sum()) if "result" in merged else 0
    if still_missing:
        print(f"  WARNING: {still_missing} row(s) still missing boxscore data; "
              f"they will be retried on the next run")
    return added


def main(rebuild: set[str] | None = None) -> None:
    rebuild = rebuild or set()
    print(f"=== variance97 update pipeline ===")
    print(f"current season window: {season_label(current_season_start_year())}")
    print(f"players: {', '.join(PLAYERS)}")
    if rebuild:
        print(f"rebuilding from scratch: {', '.join(sorted(rebuild))}")

    added = {
        key: _refresh_player(player, nhl_log_path(key, DATA_DIR),
                             rebuild=key in rebuild)
        for key, player in PLAYERS.items()
    }

    print(f"\n[team stats] refreshing opponent_team_stats.csv")
    n = build_team_stats(DATA_DIR / "opponent_team_stats.csv")
    print(f"  wrote {n} rows.")

    for key, player in PLAYERS.items():
        source = nhl_log_path(key, DATA_DIR)
        if not source.exists():
            print(f"\n[features] skipping {player.name}: no source log")
            continue
        # Only the subject has manually entered international rows.
        intl = DATA_DIR / "international_games.csv" if key == SUBJECT else None
        scope = "with international concat" if intl else "NHL only"
        print(f"\n[features] applying for {player.name} ({scope})")
        apply_features(
            nhl_source_path=source,
            team_stats_path=DATA_DIR / "opponent_team_stats.csv",
            international_path=intl,
            out_path=clean_log_path(key, DATA_DIR),
        )

    summary = ", ".join(f"{k} +{v}" for k, v in added.items())
    print(f"\n=== done. {summary} ===")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--rebuild", nargs="*", metavar="PLAYER", default=None,
        help="re-fetch these players' logs in full instead of incrementally "
             "(no names = every player). Use when a stored row is wrong: the "
             "incremental path never revisits a date it already has.",
    )
    args = parser.parse_args()

    if args.rebuild is None:
        targets: set[str] = set()
    elif args.rebuild:
        unknown = set(args.rebuild) - set(PLAYERS)
        if unknown:
            parser.error(f"unknown player(s): {', '.join(sorted(unknown))}. "
                         f"known: {', '.join(PLAYERS)}")
        targets = set(args.rebuild)
    else:
        targets = set(PLAYERS)

    main(rebuild=targets)
