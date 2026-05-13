"""
Boxscore enrichment for game-log rows.

The /v1/player/{id}/game-log/ endpoint omits the team's score, the opponent's
score, and the W/L result. This module fills those fields by querying
/v1/gamecenter/{gameId}/boxscore for each game and mapping team/opponent
scores based on the player's canonical team abbreviation.

Note: the team_abbrev passed in is the player's *current* team. If a player
was traded mid-season, the caller is responsible for passing the correct
abbreviation per game. McDavid and MacKinnon have not been traded, so this
isn't a concern in the current project.
"""
from __future__ import annotations

import json
import time
import urllib.request
from typing import Iterable


def _request_json(url: str, timeout: int = 15) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def fetch_boxscore(game_id: int) -> dict:
    return _request_json(f"https://api-web.nhle.com/v1/gamecenter/{game_id}/boxscore")


def derive_outcome(boxscore: dict, team_abbrev: str) -> dict:
    """Return {result, team_score, opp_score} for the given team in this game."""
    home = boxscore["homeTeam"]
    away = boxscore["awayTeam"]
    if home["abbrev"] == team_abbrev:
        team_score, opp_score = home["score"], away["score"]
    elif away["abbrev"] == team_abbrev:
        team_score, opp_score = away["score"], home["score"]
    else:
        # Player's team didn't play in this game -- shouldn't happen if the
        # gameId came from that player's game log, but guard anyway.
        raise ValueError(
            f"team {team_abbrev} not in boxscore (home={home['abbrev']}, away={away['abbrev']})"
        )
    return {
        "result": "W" if team_score > opp_score else "L",
        "team_score": team_score,
        "opp_score": opp_score,
    }


def enrich_rows(rows: Iterable[dict], team_abbrev: str, sleep_between: float = 0.15) -> list[dict]:
    """Fill result, team_score, opp_score on rows that don't already have them.

    Idempotent: rows with non-null result are skipped.
    """
    enriched = []
    for row in rows:
        if row.get("result") is not None:
            enriched.append(row)
            continue
        try:
            box = fetch_boxscore(row["gameId"])
            row.update(derive_outcome(box, team_abbrev))
        except Exception as e:
            print(f"  boxscore failed for {row.get('gameId')} ({row.get('date')}): {e}")
        enriched.append(row)
        time.sleep(sleep_between)
    return enriched
