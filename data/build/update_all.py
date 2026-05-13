"""
Variance97 data pipeline orchestrator.

End-to-end refresh:
  1. For each tracked player, find the latest game date in their NHL source
     CSV (the cursor) and fetch any newer games from the NHL API.
  2. Boxscore-enrich new rows with result / team_score / opp_score.
  3. Append new rows to the player's NHL source CSV.
  4. Refresh opponent_team_stats.csv from current standings.
  5. Run apply_features for McDavid (concats international_games.csv,
     computes is_elimination_game / rolling_pts_5 / rest_days /
     opp_ga_per_game) and write the merged clean CSV.
  6. Run apply_features for MacKinnon (no international file) and write
     the merged clean CSV.

Idempotent: running with no new games appends nothing. Safe to cron.

Usage:
  python -m data.build.update_all              # default: refresh both players
  python data/build/update_all.py              # equivalent
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

# Allow running directly without package install.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from apply_features import apply_features  # type: ignore
from fetch_boxscores import enrich_rows  # type: ignore
from fetch_player_log import PLAYERS, Player, fetch_player_log  # type: ignore
from fetch_team_stats import build_team_stats  # type: ignore

DATA_DIR = Path(__file__).resolve().parent.parent
SEASONS_TO_FETCH = ("20212022", "20222023", "20232024", "20242025", "20252026")


def _current_season_label() -> str:
    """Return the season label whose window contains today (e.g. '2025-26')."""
    now = datetime.now(timezone.utc)
    if now.month >= 8:  # NHL season starts Oct; treat Aug+ as next season window
        start = now.year
    else:
        start = now.year - 1
    return f"{start}-{str(start + 1)[-2:]}"


def _refresh_player(player: Player, source_csv: Path) -> int:
    """Fetch any games newer than what's in source_csv, boxscore-enrich, append."""
    print(f"\n[{player.name}] refreshing {source_csv.name}")

    if source_csv.exists():
        existing = pd.read_csv(source_csv)
        existing_dates = set(existing["date"].astype(str)) if len(existing) else set()
        latest = max(existing_dates) if existing_dates else None
        print(f"  existing rows: {len(existing)}  (latest: {latest})")
    else:
        existing = pd.DataFrame()
        existing_dates = set()
        print("  existing rows: 0  (cold start)")

    # Fetch all configured seasons; we'll filter to truly new games below.
    fetched = fetch_player_log(player, seasons=SEASONS_TO_FETCH)

    new_rows = [r for r in fetched if r["date"] not in existing_dates]
    if not new_rows:
        print("  no new games. up to date.")
        return 0

    print(f"  found {len(new_rows)} new game(s); enriching boxscores...")
    new_rows = enrich_rows(new_rows, team_abbrev=player.team_abbrev)

    new_df = pd.DataFrame(new_rows)
    # Drop columns that aren't part of the source schema (e.g. gameId,
    # home_away if not used downstream). Keep the source schema canonical.
    source_cols = list(existing.columns) if len(existing) else None
    if source_cols:
        for col in source_cols:
            if col not in new_df.columns:
                new_df[col] = None
        new_df = new_df[source_cols]

    merged = pd.concat([existing, new_df], ignore_index=True, sort=False)
    merged = merged.drop_duplicates(subset=["date"], keep="last").reset_index(drop=True)
    merged.to_csv(source_csv, index=False)
    print(f"  wrote {len(merged)} rows -> {source_csv.name} (+{len(new_rows)})")
    return len(new_rows)


def main() -> None:
    print(f"=== variance97 update pipeline ===")
    print(f"current season window: {_current_season_label()}")

    mcdavid = PLAYERS["mcdavid"]
    mackinnon = PLAYERS["mackinnon"]

    mcd_added = _refresh_player(mcdavid, DATA_DIR / "mcdavid_nhl_log.csv")
    mac_added = _refresh_player(mackinnon, DATA_DIR / "mackinnon_nhl_log.csv")

    print(f"\n[team stats] refreshing opponent_team_stats.csv")
    n = build_team_stats(DATA_DIR / "opponent_team_stats.csv")
    print(f"  wrote {n} rows.")

    print(f"\n[features] applying for McDavid (with international concat)")
    apply_features(
        nhl_source_path=DATA_DIR / "mcdavid_nhl_log.csv",
        team_stats_path=DATA_DIR / "opponent_team_stats.csv",
        international_path=DATA_DIR / "international_games.csv",
        out_path=DATA_DIR / "mcdavid_game_log_clean.csv",
    )

    if (DATA_DIR / "mackinnon_nhl_log.csv").exists():
        print(f"\n[features] applying for MacKinnon (NHL only)")
        apply_features(
            nhl_source_path=DATA_DIR / "mackinnon_nhl_log.csv",
            team_stats_path=DATA_DIR / "opponent_team_stats.csv",
            international_path=None,
            out_path=DATA_DIR / "mackinnon_game_log_clean.csv",
        )

    print(f"\n=== done. mcdavid +{mcd_added}, mackinnon +{mac_added} ===")


if __name__ == "__main__":
    main()
