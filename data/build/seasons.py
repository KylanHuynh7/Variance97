"""
Season bookkeeping, shared by the fetchers.

The season list used to be hardcoded in two places and ended at 2025-26, so
the pipeline would have stopped picking up new games the moment the 2026-27
season opened -- silently, because "no new games" is also what a healthy run
prints. Everything here derives from the clock instead.

Two spellings of a season are in play:
  season_id     "20212022"  -- what api-web.nhle.com/v1/player/.../game-log wants
  season_label  "2021-22"   -- what the CSVs carry in their `season` column
"""
from __future__ import annotations

from datetime import date, datetime, timezone

# McDavid's window for this project. Everything runs forward from here.
FIRST_SEASON_START_YEAR = 2021

# An NHL season is named for the calendar year it starts in. It opens in
# October, so anything from August onward belongs to the season starting this
# year; anything earlier belongs to the one that started last year.
SEASON_ROLLOVER_MONTH = 8


def current_season_start_year(today: date | None = None) -> int:
    today = today or datetime.now(timezone.utc).date()
    return today.year if today.month >= SEASON_ROLLOVER_MONTH else today.year - 1


def season_label(start_year: int) -> str:
    """2021 -> '2021-22'."""
    return f"{start_year}-{str(start_year + 1)[-2:]}"


def season_id(start_year: int) -> str:
    """2021 -> '20212022'."""
    return f"{start_year}{start_year + 1}"


def season_start_years(today: date | None = None) -> list[int]:
    """Every season start year from the project's first through the current one."""
    return list(range(FIRST_SEASON_START_YEAR, current_season_start_year(today) + 1))


def season_ids(today: date | None = None) -> tuple[str, ...]:
    return tuple(season_id(y) for y in season_start_years(today))


def season_labels(today: date | None = None) -> tuple[str, ...]:
    return tuple(season_label(y) for y in season_start_years(today))
