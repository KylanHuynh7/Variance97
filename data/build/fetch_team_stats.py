"""
Build/refresh opponent_team_stats.csv from NHL standings.

Per-season team goals-against / game and goals-for / game. Used as the
opponent-strength feature in Phase 3, and as a generic "how good is this
defense" reference for any future analysis.

Refreshes the full file each call -- standings drift mid-season, so the latest
snapshot is always the right answer.
"""
from __future__ import annotations

import csv
import json
import urllib.request
from pathlib import Path

# Date used to query season-end (or near-end) standings per season.
# Pick dates a few days before playoffs so the full regular season is captured.
SEASON_SNAPSHOTS = {
    "2021-22": "2022-04-30",
    "2022-23": "2023-04-13",
    "2023-24": "2024-04-18",
    "2024-25": "2025-04-15",
    "2025-26": "2026-04-15",
}


def _fetch_standings(date: str) -> dict:
    url = f"https://api-web.nhle.com/v1/standings/{date}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)


def build_team_stats(out_path: Path) -> int:
    rows = []
    for season, date in SEASON_SNAPSHOTS.items():
        try:
            data = _fetch_standings(date)
        except Exception as e:
            print(f"  {season} ({date}): failed -- {e}")
            continue
        added = 0
        for t in data.get("standings", []):
            gp = t.get("gamesPlayed") or 0
            ga = t.get("goalAgainst") or 0
            gf = t.get("goalFor") or 0
            if gp == 0:
                continue
            abbrev = t["teamAbbrev"]["default"] if isinstance(t.get("teamAbbrev"), dict) else t.get("teamAbbrev")
            rows.append({
                "season": season,
                "team_abbrev": abbrev,
                "games_played": gp,
                "ga_per_game": round(ga / gp, 4),
                "gf_per_game": round(gf / gp, 4),
            })
            added += 1
        print(f"  {season} ({date}): {added} teams")

    fields = ["season", "team_abbrev", "games_played", "ga_per_game", "gf_per_game"]
    with out_path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    return len(rows)


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "opponent_team_stats.csv"
    n = build_team_stats(out)
    print(f"\nWrote {n} rows -> {out}")
