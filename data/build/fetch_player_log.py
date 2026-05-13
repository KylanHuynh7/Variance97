"""
Generic NHL game-log fetcher.

Pulls a player's per-game stats from the NHL API, normalizes the schema to
match mcdavid_game_log_clean.csv, and returns rows. Used for both McDavid and
MacKinnon (and any future peer additions).

The gameLog endpoint does not return result, team_score, or opp_score --
those are filled in later by data/build/fetch_boxscores.py.

NHL API gameId encoding (10 digits):
  YYYY 02 NNNN  -> regular season
  YYYY 03 0RSG  -> playoffs (R = round 1-4, S = series, G = game 1-7)
"""
from __future__ import annotations

import json
import time
import urllib.request
from dataclasses import dataclass
from typing import Iterable

DEFAULT_GAME_TYPES = (2, 3)  # 2 = regular season, 3 = playoffs

PLAYOFF_ROUND_TO_CONTEXT = {
    "1": "first_round",
    "2": "second_round",
    "3": "conf_finals",
    "4": "stanley_cup_finals",
}


@dataclass(frozen=True)
class Player:
    player_id: int
    name: str
    team_abbrev: str  # used by fetch_boxscores to determine W/L; canonical NHL team


PLAYERS = {
    "mcdavid": Player(8478402, "Connor McDavid", "EDM"),
    "mackinnon": Player(8477492, "Nathan MacKinnon", "COL"),
}


def _request_json(url: str, timeout: int = 15) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def _toi_to_decimal(toi_str: str) -> float | None:
    if not toi_str or ":" not in toi_str:
        return None
    m, s = toi_str.split(":")
    return int(m) + int(s) / 60.0


def _season_label(season_id: str) -> str:
    return f"{season_id[:4]}-{season_id[6:8]}"


def _derive_context(game_id: int, game_type: int) -> str:
    if game_type == 2:
        return "regular_season"
    return PLAYOFF_ROUND_TO_CONTEXT.get(str(game_id)[7], "playoffs_unknown")


def _derive_game_number(game_id: int, game_type: int) -> int | None:
    if game_type == 2:
        return None
    return int(str(game_id)[9])


def fetch_season(player_id: int, season: str, game_type: int) -> list[dict]:
    """Fetch a single season+game_type page from the NHL API."""
    url = f"https://api-web.nhle.com/v1/player/{player_id}/game-log/{season}/{game_type}"
    data = _request_json(url)
    return data.get("gameLog") or []


def fetch_player_log(
    player: Player,
    seasons: Iterable[str],
    game_types: Iterable[int] = DEFAULT_GAME_TYPES,
    sleep_between: float = 0.2,
) -> list[dict]:
    """Fetch a player's games across seasons; returns rows in clean schema.

    Fields filled here from gameLog: date, opponent, goals, assists, points,
    plus_minus, SOG, TOI, game_number, game_context, season, home_away, gameId.
    Fields filled later (boxscore enrichment): result, team_score, opp_score.
    Features filled by apply_features.py: is_elimination_game, rest_days,
    is_back_to_back, rolling_pts_5, opp_ga_per_game.
    """
    rows: list[dict] = []
    for season in seasons:
        for gt in game_types:
            try:
                log = fetch_season(player.player_id, season, gt)
            except Exception as e:
                print(f"  skip {player.name} {season} type={gt}: {e}")
                continue
            for g in log:
                rows.append({
                    "gameId": g["gameId"],
                    "date": g.get("gameDate"),
                    "opponent": g.get("opponentAbbrev"),
                    "goals": g.get("goals"),
                    "assists": g.get("assists"),
                    "points": g.get("points"),
                    "plus_minus": g.get("plusMinus"),
                    "SOG": g.get("shots"),
                    "TOI": _toi_to_decimal(g.get("toi", "")),
                    "result": None,        # filled by fetch_boxscores
                    "team_score": None,    # filled by fetch_boxscores
                    "opp_score": None,     # filled by fetch_boxscores
                    "game_number": _derive_game_number(g["gameId"], gt),
                    "game_context": _derive_context(g["gameId"], gt),
                    "season": _season_label(season),
                    "is_elimination_game": False,  # filled by apply_features
                    "home_away": g.get("homeRoadFlag"),
                })
            print(f"  {player.name} {season} type={gt}: {len(log)} games")
            time.sleep(sleep_between)
    rows.sort(key=lambda r: r["date"] or "")
    return rows
