"""
Build/refresh opponent_team_stats.csv from NHL standings.

Per-season team goals-against / game and goals-for / game. Used as the
opponent-strength feature in Phase 3, and as a generic "how good is this
defense" reference for any future analysis.

Refreshes the full file each call -- standings drift mid-season, so the latest
snapshot is always the right answer.

Failure policy: this file is an input to every downstream step, and a short
file is far more dangerous than no file, because a season that quietly fails
to fetch takes its games out of the model with no error anywhere. So a season
that cannot be fetched, or that comes back with an implausible number of
teams, raises -- and nothing is written unless every season succeeded. The
write itself goes through a temp file and an atomic replace, so an
interrupted run also leaves the previous good file in place.
"""
from __future__ import annotations

import csv
import json
import os
import tempfile
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

from seasons import season_label, season_start_years  # type: ignore

# A full league is 32 teams. Accept a little slack for expansion or for a
# snapshot taken before every team has played, but not a half-empty result.
MIN_TEAMS_PER_SEASON = 28

# Real regular-season-end dates for the seasons that have finished. Kept
# explicit so re-running the pipeline reproduces the same historical numbers
# rather than drifting with whatever the API returns for a generic date.
KNOWN_SNAPSHOTS = {
    "2021-22": "2022-04-30",
    "2022-23": "2023-04-13",
    "2023-24": "2024-04-18",
    "2024-25": "2025-04-15",
    "2025-26": "2026-04-15",
}

# Fallback for a finished season we have no explicit date for: late enough to
# capture the full schedule, early enough to precede the playoffs.
DEFAULT_SNAPSHOT_MONTH_DAY = "04-15"


class StandingsUnavailable(RuntimeError):
    """A season's standings could not be fetched, or came back too short."""


def season_snapshots(today: date | None = None) -> dict[str, str]:
    """Season label -> the date whose standings to query.

    A season still in progress is snapshotted as of today, because its
    end-of-season date hasn't happened yet.
    """
    today = today or datetime.now(timezone.utc).date()
    out: dict[str, str] = {}
    for start_year in season_start_years(today):
        label = season_label(start_year)
        snapshot = KNOWN_SNAPSHOTS.get(
            label, f"{start_year + 1}-{DEFAULT_SNAPSHOT_MONTH_DAY}"
        )
        # Never ask for a date in the future -- the API has nothing there.
        out[label] = min(snapshot, today.isoformat())
    return out


def _fetch_standings(date: str) -> dict:
    url = f"https://api-web.nhle.com/v1/standings/{date}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)


def _rows_for_season(season: str, snapshot: str) -> list[dict]:
    try:
        data = _fetch_standings(snapshot)
    except Exception as e:
        raise StandingsUnavailable(f"{season} ({snapshot}): fetch failed -- {e}") from e

    rows = []
    for t in data.get("standings", []):
        gp = t.get("gamesPlayed") or 0
        ga = t.get("goalAgainst") or 0
        gf = t.get("goalFor") or 0
        if gp == 0:
            continue
        abbrev = (t["teamAbbrev"]["default"]
                  if isinstance(t.get("teamAbbrev"), dict) else t.get("teamAbbrev"))
        rows.append({
            "season": season,
            "team_abbrev": abbrev,
            "games_played": gp,
            "ga_per_game": round(ga / gp, 4),
            "gf_per_game": round(gf / gp, 4),
        })

    if len(rows) < MIN_TEAMS_PER_SEASON:
        raise StandingsUnavailable(
            f"{season} ({snapshot}): only {len(rows)} teams with games played, "
            f"expected at least {MIN_TEAMS_PER_SEASON}"
        )
    return rows


def build_team_stats(out_path: Path, today: date | None = None) -> int:
    """Fetch every season's standings and rewrite out_path.

    Raises StandingsUnavailable without touching out_path if any season fails,
    so a network blip can never shorten the file that the rest of the pipeline
    depends on.
    """
    snapshots = season_snapshots(today)
    rows: list[dict] = []
    for season, snapshot in snapshots.items():
        season_rows = _rows_for_season(season, snapshot)
        rows.extend(season_rows)
        print(f"  {season} ({snapshot}): {len(season_rows)} teams")

    fields = ["season", "team_abbrev", "games_played", "ga_per_game", "gf_per_game"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=str(out_path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            w.writerows(rows)
        os.replace(tmp_name, out_path)
    except BaseException:
        Path(tmp_name).unlink(missing_ok=True)
        raise
    return len(rows)


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "opponent_team_stats.csv"
    n = build_team_stats(out)
    print(f"\nWrote {n} rows -> {out}")
