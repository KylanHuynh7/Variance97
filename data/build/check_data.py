"""
Sanity checks on the pipeline's output, run before anything is published.

The daily GitHub Action pushes straight to main, and main is the live site, so
this is the last point at which a bad fetch can be stopped by a machine
instead of noticed by a reader. Exits non-zero on any failure, which stops the
workflow before its commit step.

What is checked, and why each has earned its place:

  - Teammates agree. Two players on the same team share every game, so they
    must agree on result, both scores, opponent and opposing goalie. This is
    the check that found the VEG/VGK and impossible-score bugs.
  - Every NHL row is enriched. A missing result or goalie is retried on the
    next run, but it should not be published in the meantime.
  - Scores are self-consistent. A "W" with team_score <= opp_score is how the
    impossible-score bug looked.
  - No duplicate dates, no games dated in the future.
  - Every NHL row joined an opponent strength. The VEG/VGK bug silently took
    19 games out of the model by failing exactly this join.

Usage:
  python3 data/build/check_data.py
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_player_log import PLAYERS, clean_log_path, nhl_log_path  # type: ignore  # noqa: E402

DATA_DIR = Path(__file__).resolve().parent.parent

# Same-team pairs across the whole window. A trade ends a pair's shared
# history, so only list players who have been teammates throughout.
TEAMMATES = [("mcdavid", "draisaitl")]
SHARED_COLUMNS = ["result", "team_score", "opp_score", "opponent", "opp_goalie_id"]


def check() -> list[str]:
    problems: list[str] = []
    today = datetime.now(timezone.utc).date().isoformat()

    for key, player in PLAYERS.items():
        path = nhl_log_path(key, DATA_DIR)
        if not path.exists():
            problems.append(f"{player.name}: {path.name} is missing")
            continue
        log = pd.read_csv(path)

        dupes = log["date"][log["date"].duplicated()]
        if len(dupes):
            problems.append(f"{player.name}: duplicate dates {sorted(dupes)[:5]}")

        future = log["date"][log["date"].astype(str) > today]
        if len(future):
            problems.append(f"{player.name}: games dated in the future {sorted(future)[:5]}")

        for col in ("result", "opp_goalie_id"):
            missing = int(log[col].isna().sum())
            if missing:
                problems.append(f"{player.name}: {missing} row(s) missing {col}")

        scored = log.dropna(subset=["result", "team_score", "opp_score"])
        bad = scored[(scored["result"] == "W") != (scored["team_score"] > scored["opp_score"])]
        if len(bad):
            problems.append(f"{player.name}: {len(bad)} row(s) whose result contradicts the score, "
                            f"e.g. {bad['date'].iloc[0]}")

        clean = pd.read_csv(clean_log_path(key, DATA_DIR))
        nhl = clean[~clean["game_context"].str.startswith(("four_nations", "olympics"))]
        unjoined = nhl[nhl["opp_ga_per_game"].isna()]
        if len(unjoined):
            problems.append(f"{player.name}: {len(unjoined)} NHL row(s) joined no opponent "
                            f"strength, e.g. {unjoined['opponent'].iloc[0]} "
                            f"on {unjoined['date'].iloc[0]}")

    for a, b in TEAMMATES:
        left = pd.read_csv(nhl_log_path(a, DATA_DIR))
        right = pd.read_csv(nhl_log_path(b, DATA_DIR))
        shared = left.merge(right, on="date", suffixes=("_a", "_b"))
        for col in SHARED_COLUMNS:
            differs = shared[shared[f"{col}_a"] != shared[f"{col}_b"]]
            if len(differs):
                problems.append(f"{a} vs {b}: {len(differs)} shared game(s) disagree on {col}, "
                                f"e.g. {differs['date'].iloc[0]}")
    return problems


def main() -> None:
    problems = check()
    if problems:
        print("DATA CHECK FAILED")
        for p in problems:
            print(f"  - {p}")
        sys.exit(1)
    print(f"data check passed: {len(PLAYERS)} players, {len(TEAMMATES)} teammate pair(s)")


if __name__ == "__main__":
    main()
