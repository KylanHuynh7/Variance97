"""
Boxscore enrichment for game-log rows.

The /v1/player/{id}/game-log/ endpoint omits the team's score, the opponent's
score, and the W/L result. This module fills those fields by querying
/v1/gamecenter/{gameId}/boxscore for each game.

Which side of the boxscore is "the player's team" is decided by elimination:
the row already carries the opponent's abbreviation, straight from that
player's own game log, so the player's team is whichever of home/away is not
the opponent. This holds through a trade, which a fixed per-player team
abbreviation does not -- and the registry is open to any player now, so the
assumption that nobody in it has ever been traded is not one to keep making.
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


def derive_outcome(boxscore: dict, opponent_abbrev: str) -> dict:
    """Return {result, team_score, opp_score} from the player's perspective.

    Identified by elimination against the opponent rather than by matching the
    player's own team, so a mid-season trade needs no special handling.
    """
    home = boxscore["homeTeam"]
    away = boxscore["awayTeam"]
    if away["abbrev"] == opponent_abbrev:
        team_score, opp_score = home["score"], away["score"]
    elif home["abbrev"] == opponent_abbrev:
        team_score, opp_score = away["score"], home["score"]
    else:
        # The opponent came from this player's own game log, so it should
        # always be one of the two teams. Guard rather than silently pick.
        raise ValueError(
            f"opponent {opponent_abbrev} not in boxscore "
            f"(home={home['abbrev']}, away={away['abbrev']})"
        )
    return {
        "result": "W" if team_score > opp_score else "L",
        "team_score": team_score,
        "opp_score": opp_score,
    }


def enrich_rows(rows: Iterable[dict], sleep_between: float = 0.15) -> list[dict]:
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
            row.update(derive_outcome(box, row["opponent"]))
        except Exception as e:
            print(f"  boxscore failed for {row.get('gameId')} ({row.get('date')}): {e}")
        enriched.append(row)
        time.sleep(sleep_between)
    return enriched
