# Phase 4 — Data Pipeline Plan

## Goal

Make the dataset self-updating as new games are played, and make the pipeline robust enough to actually support the reframed project (peer comparison, opponent strength as a feature, derived features that need recomputation). The original Phase 4 was just "pull McDavid from the API." Now there are multiple players' worth of inputs plus a feature recomputation step that all need to stay in sync.

## What Phase 4 produces

- Up-to-date `mcdavid_game_log_clean.csv` and `mackinnon_game_log_clean.csv` without manual editing for NHL games.
- Up-to-date `opponent_team_stats.csv` whenever standings shift.
- A clear, scripted workflow for international games (manual entry — the NHL API doesn't cover Four Nations / Olympics).
- Idempotent reruns: safe to run on a cron, won't double-add games.
- Feature recomputation built in, so `is_elimination_game`, `rolling_pts_5`, and `opp_ga_per_game` are always consistent with the latest data.

## Module layout

```
data/
  build/
    fetch_player_log.py     # generic NHL game-log fetcher (McDavid + MacKinnon)
    fetch_boxscores.py      # adds result, team_score, opp_score per game
    fetch_team_stats.py     # (renamed from _build_team_stats.py)
    apply_features.py       # (renamed from _prep_features.py)
    update_all.py           # orchestrator — entry point for cron / CLI
  international_games.csv   # manual-entry file for Four Nations / Olympics
scripts/
  run_update.sh             # one-shot CLI wrapper
notebooks/
  04_nhl_api_pipeline.ipynb # interactive demo + smoke test
```

## What `update_all.py` does, step by step

1. **Load existing CSV, find the latest game date.** This is the cursor — only fetch games newer than it.
2. **Pull the NHL API current-season `gameLog`** for McDavid (`8478402`) and MacKinnon (`8477492`).
3. **Filter to games newer than the cursor.** Idempotent by design.
4. **For each new game, fetch the boxscore** (`/v1/gamecenter/{gameId}/boxscore`). The `gameLog` endpoint does not return `result`, `team_score`, or `opp_score` — those come from boxscore. One extra API call per new game; throttle with a small sleep.
5. **Concatenate the international manual-entry CSV** so Four Nations / Olympics games are always part of the dataset.
6. **Refresh `opponent_team_stats.csv`** from the current standings endpoint.
7. **Run `apply_features.py`** to recompute `is_elimination_game` (rule-based), `rolling_pts_5`, `rest_days`, `is_back_to_back`, and `opp_ga_per_game` from scratch on the full dataset.
8. **Print a diff summary** — e.g., "added 3 McDavid games, 2 MacKinnon games, refreshed team stats."

## Schema challenge: missing fields in `gameLog`

The NHL API endpoint already in use returns goals, assists, points, plus_minus, shots, TOI, and opponent — but **not** `result`, `team_score`, or `opp_score`. Two options:

- **(chosen) Fetch boxscore per new game.** One extra call per new game, only happens for games not yet in the CSV. Adds maybe 5 calls/week during the regular season — well within polite-use limits for a public API.
- (rejected) Skip those fields. Phase 1's W/L analysis depends on `result`, so this isn't viable.

## International games — the manual workflow

The NHL API doesn't cover Four Nations / Olympics. For these:

- Create `data/international_games.csv` with the same schema as the clean CSV.
- Add a row whenever McDavid plays a Four Nations / Olympics game.
- `apply_features.py` concatenates this with the API-derived data before computing features.
- README documents the workflow and points to a template row.

This is small, finite work (a handful of games every couple years) and beats trying to scrape Olympics.com or NHL.com event pages, which break unpredictably.

## What's deliberately out of scope for Phase 4

- **Streamlit app** — that's Phase 5.
- **Goalie features** (Limitation #5) — separate engineering effort, would need boxscore-level goalie stats and per-season save% data.
- **Peer expansion** (Limitation #3) — adding Matthews/Crosby/Draisaitl is a one-line config change once `fetch_player_log.py` is generic, but it belongs in stretch.
- **Real-time updates** — a daily cron is sufficient. Anything finer is over-engineering.

## Stretch milestones (nice-to-have)

- **GitHub Action** scheduled to run nightly during the season. Commits CSV updates back to the repo automatically.
- **Validation tests** (`pytest`) that check row counts, schema match, no negative TOI, no future-dated games, etc. — small but valuable for a public-facing project.
- **Add 2–3 more peers** by extending `fetch_player_log.py`'s player ID list. Strengthens Phase 1 + 2's peer comparison and directly addresses Limitation #3.

## Handoff to Phase 5

The pipeline writes the **same CSV schema** Phases 1–3 already consume. Phase 5's Streamlit app reads that CSV; no Phase 5 code changes are needed when the pipeline runs. The nice property: Phase 5 always has fresh data without ever touching the API itself.

## Estimated effort

The core pipeline is roughly a day's work — most of the API logic already exists in `_build_mackinnon.py` and `_build_team_stats.py`. The new pieces are:

- Boxscore enrichment (1–2 hrs)
- Cursor / idempotency logic (1 hr)
- Orchestrator + CLI (1–2 hrs)
- International concat + manual-entry workflow (1 hr)
- Notebook smoke test (1 hr)

Stretch milestones (GitHub Action, validation tests, additional peers) add another half-day each if pursued.

## Order of work

1. Generalize the existing `_build_mackinnon.py` into `fetch_player_log.py` (parameterize by player ID).
2. Add `fetch_boxscores.py` and verify against a known recent game.
3. Build cursor-based incremental update.
4. Wire `apply_features.py` (rename `_prep_features.py`) into the orchestrator.
5. Add `international_games.csv` template + concat logic.
6. Update notebook 04 to demonstrate end-to-end flow.
7. (Stretch) GitHub Action, validation tests, extra peers.
