"""
Game-by-game logs for every goalie the tracked players have faced.

apply_features turns these into `opp_goalie_sv_pct`: the opposing starter's
save percentage over the year *before* each game. That needs the goalie's own
games, not just the ones against our players, so for every (goalie, season)
that appears as an opposing starter in any source log -- plus the season
before it, so an October game still has a year of history behind it -- this
fetches /v1/player/{id}/game-log/{season}/{2,3}.

Caching: a finished season's log never changes, so pairs already in the file
are kept and not refetched. The current season is always refetched, because
it grows. A past pair with no games at all (a goalie's pre-NHL season) leaves
no rows to remember it by and is asked for again each run; that is a handful
of cheap calls and not worth a manifest file.

Failure policy matches fetch_team_stats: a goalie-season that cannot be
fetched raises, and nothing is written. A missing log would not error
downstream -- it would quietly shrink that goalie's save% to league average
-- so it has to stop here.
"""
from __future__ import annotations

import json
import os
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Iterable

import pandas as pd

from seasons import current_season_start_year, season_label  # type: ignore

GOALIE_LOG_COLUMNS = [
    "goalie_id", "season", "date", "game_type",
    "games_started", "shots_against", "goals_against",
]
GAME_TYPES = (2, 3)  # regular season, playoffs


class GoalieLogUnavailable(RuntimeError):
    """A goalie-season log could not be fetched."""


def _request_json(url: str, timeout: int = 15) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def _season_id(label: str) -> str:
    """'2021-22' -> '20212022'."""
    start = int(label[:4])
    return f"{start}{start + 1}"


def _previous_season(label: str) -> str:
    return season_label(int(label[:4]) - 1)


def fetch_goalie_season(goalie_id: int, season: str, sleep_between: float = 0.15) -> list[dict]:
    rows: list[dict] = []
    for gt in GAME_TYPES:
        url = (f"https://api-web.nhle.com/v1/player/{goalie_id}"
               f"/game-log/{_season_id(season)}/{gt}")
        try:
            data = _request_json(url)
        except urllib.error.HTTPError as e:
            # No playoff games is an empty log, not an outage.
            if e.code == 404:
                data = {}
            else:
                raise GoalieLogUnavailable(f"goalie {goalie_id} {season} type={gt}: {e}") from e
        except Exception as e:
            raise GoalieLogUnavailable(f"goalie {goalie_id} {season} type={gt}: {e}") from e
        for g in data.get("gameLog") or []:
            rows.append({
                "goalie_id": int(goalie_id),
                "season": season,
                "date": g.get("gameDate"),
                "game_type": gt,
                "games_started": int(g.get("gamesStarted") or 0),
                "shots_against": int(g.get("shotsAgainst") or 0),
                "goals_against": int(g.get("goalsAgainst") or 0),
            })
        time.sleep(sleep_between)
    return rows


def required_pairs(source_logs: Iterable[Path]) -> set[tuple[int, str]]:
    """(goalie_id, season) for every opposing starter, plus the prior season."""
    pairs: set[tuple[int, str]] = set()
    for path in source_logs:
        if not Path(path).exists():
            continue
        df = pd.read_csv(path)
        if "opp_goalie_id" not in df.columns:
            continue
        seen = df.dropna(subset=["opp_goalie_id"])[["opp_goalie_id", "season"]].drop_duplicates()
        for gid, season in seen.itertuples(index=False):
            pairs.add((int(gid), season))
            pairs.add((int(gid), _previous_season(season)))
    return pairs


def build_goalie_logs(out_path: Path, source_logs: Iterable[Path]) -> int:
    """Fetch any missing goalie-season logs and rewrite out_path atomically."""
    pairs = required_pairs(source_logs)
    current = season_label(current_season_start_year())

    if out_path.exists():
        existing = pd.read_csv(out_path)
    else:
        existing = pd.DataFrame(columns=GOALIE_LOG_COLUMNS)
    have = set(zip(existing["goalie_id"].astype(int), existing["season"]))

    # Keep finished seasons we already hold; refetch everything else we need.
    to_fetch = sorted(p for p in pairs if p not in have or p[1] == current)
    keep = existing[[
        (int(g), s) in pairs and (int(g), s) not in to_fetch
        for g, s in zip(existing["goalie_id"], existing["season"])
    ]] if len(existing) else existing

    print(f"  {len(pairs)} goalie-seasons needed, {len(to_fetch)} to fetch")
    fresh: list[dict] = []
    for i, (gid, season) in enumerate(to_fetch, 1):
        fresh.extend(fetch_goalie_season(gid, season))
        if i % 50 == 0:
            print(f"    {i}/{len(to_fetch)}")

    out = pd.concat([keep, pd.DataFrame(fresh, columns=GOALIE_LOG_COLUMNS)], ignore_index=True)
    # A goalie appears once per game; a doubled pair would double his shots.
    out = (out.drop_duplicates(subset=["goalie_id", "date"], keep="last")
              .sort_values(["goalie_id", "date"])
              .reset_index(drop=True))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=str(out_path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", newline="") as f:
            out[GOALIE_LOG_COLUMNS].to_csv(f, index=False)
        os.replace(tmp_name, out_path)
    except BaseException:
        Path(tmp_name).unlink(missing_ok=True)
        raise
    return len(out)
