# Tracing

Continuity document. `README.md` explains what the project *is*; this explains
where it currently *stands*, what changed recently and why, what is known to be
fragile, and what is worth doing next. Read this first when picking the project
back up cold.

**Last updated:** 2026-09-14 · goalie features on `feat/goalie-features` (see §3). `main` at `1b51e2e` is what is deployed.

---

## 1. Current state in one screen

| | |
| --- | --- |
| Branch | `main`, clean, pushed. Everything below is merged and deployed. |
| Live site | https://variance97.vercel.app — serving the current numbers (verified). |
| Dataset | Through **2026-04-30**. 478 McDavid games (468 NHL + 10 international). |
| Peer group | 6 players tracked: McDavid + MacKinnon, Draisaitl, Eichel, Matthews, Crosby. |
| Model | Ridge on 463 in-scope NHL games, 11 features including `opp_goalie_sv_pct`, `regular_season` as pinned baseline. |
| Season | Offseason. 2026-27 opens **October 2026** — the pipeline is ready for it (see §5). |

### The numbers a new session should know

Regular season → Stanley Cup Finals, points per game:

| Player | RS | Finals | Change | Relative | n |
| --- | --- | --- | --- | --- | --- |
| Eichel | 1.09 | 1.09 | +0.00 | +0% | 11 |
| **McDavid** | **1.67** | **1.38** | **−0.28** | **−17%** | **13** |
| MacKinnon | 1.54 | 1.00 | −0.54 | −35% | 6 |
| Draisaitl | 1.45 | 0.85 | −0.60 | −42% | 13 |

Matthews and Crosby reached no Final in the window (they contribute to earlier
rounds only). Ridge coefficient on `game_context_stanley_cup_finals`: **+0.051**
on the full refit, **+0.04** on the notebook's chronological training split.
`game_number` is the largest at **−0.28**. `opp_goalie_sv_pct` is the smallest
at **−0.010** (+0.015 on the notebook split).

---

## 2. The current thesis, stated precisely

The popular claim is "McDavid can't win the big one." What the data supports is
narrower, and it has moved twice in recent work — in both directions.

**What holds:**

- He won the 2025 Four Nations (scoring the OT winner) and set the Olympic
  record with 13 points in 6 games at Milan Cortina 2026.
- His Finals decline is **mid-pack** among five elite centres of the same era.
  The strongest version of H1 fails: if his Finals output were unusually low for
  an elite forward, he would be at the bottom of that distribution.
- Once real gameplay features compete, the "Stanley Cup Finals" label carries
  essentially nothing (+0.05). The signal lives in `game_number` (late-series)
  and `opp_ga_per_game` (opponent quality).
- **The goalie carries nothing.** The opposing starter's prior-year save%
  (shrunk to league average) is −0.010, flips sign with the shrinkage prior,
  and worsens cross-validated fit. Bobrovsky's prior-year save% going into both
  Finals was league average (.910, .904). H3's "elite goaltender" form is not
  supported at the goalie level; the suppression lives in team defence. Caveat:
  raw save% ignores shot quality — GSAx needs xG data (roadmap item 4).

**What was retracted:**

- ~~"His decline is half a comparable peer's."~~ True of MacKinnon, who was the
  only peer for most of the project's life. Against Eichel it runs the other
  way. This claim was on the home page and is now gone.

**What runs against the thesis and is stated anyway:**

- The **2025-26 first round** (lost 2–4 to Anaheim): McDavid at 1.00 pts/game
  against a 1.67 rate, at −8. His lowest-scoring and worst-plus-minus series of
  the 14 in the window, and a bigger drop than any peer's Finals decline. It is
  6 games, so Limitation #1 applies to it exactly as it applies to the finding —
  but it is named on the home page, in Act I, in the README and in LIMITATIONS
  rather than averaged away.

**Two peers that are not interchangeable draws:**

- **Draisaitl is a within-team control.** Same two Finals, same opponent, same
  supporting cast, steepest decline in the group. Cleanest available separation
  of "individual" from "team." He is deliberately **excluded** from Phase 2's
  pooled peer t-test: his Finals games are not comparable to McDavid's, they are
  literally the same games, and a between-player test needs independent samples.
- **Eichel faced the confound.** Vegas beat the same Panthers core in the 2023
  Final and he scored 1.60 pts/game doing it, above his own rate. This
  disentangles nothing inside Edmonton's rows, but it kills the general form of
  H3: the Panthers system does not suppress every elite centre.

---

## 3. What changed recently, and why

Three merges, in order. Each commit message carries the full reasoning; this is
the map.

### `478d2d7` — pipeline, model and web correctness

Four fixes that had been sitting **unmerged on a branch while the live site
served the buggy numbers**. Merging them was the first thing done.

- A failed standings fetch used to destroy the file it was refreshing; now it
  raises and writes nothing (atomic replace).
- The season list stopped at 2025-26 hardcoded; now derived from the clock.
- A failed boxscore was permanent; now detected and retried.
- `rest_days` / `rolling_pts_5` reset at the season boundary — the offseason was
  being counted as rest, inflating the SD from 1.27 to 11.69 and flattening the
  coefficient toward zero.
- `regular_season` pinned as the dummy baseline. It had been `conf_finals`,
  silently, so every context coefficient was a difference from the wrong thing.
- The 2026 Olympic group games were labelled `olympics_exhibition` and filtered
  out of a figure titled "group stage and knockouts."

### `a7ab0b3` — the 2025-26 season, and notebook reconciliation

The season was in the CSVs and in none of the prose. Added it across README,
both dashboards and LIMITATIONS, including the part where it fits the reframing
worst. Re-ran the notebooks against the corrected pipeline, which exposed a
chart that would have drawn blank labels (opponent map didn't know SUI/FRA) and
a claim about pointless games that was off by seventeen.

### `dce542d` — the peer distribution

Replaced the single peer with five. Cost the project its tidiest claim, which is
the reason the exercise was worth doing. Also surfaced three bugs — see §4.

### `feat/goalie-features` — the opposing goalie, tested

- Boxscore enrichment now stores the opposing starter (`opp_goalie_id`,
  `opp_goalie_name`). A row missing them counts as stale, exactly like a row
  missing `result` — so the first run after the upgrade backfilled every
  player's full history with no `--rebuild`. Every pre-existing value in all 14
  CSVs was verified identical afterwards.
- `fetch_goalie_logs.py` pulls each opposing goalie's own game log (current
  and prior season) into `goalie_game_logs.csv`: 131 goalies, ~16k rows.
  Finished seasons are cached; the current one is always refetched.
- `opp_goalie_sv_pct` in `apply_features.py`: 365-day window strictly before
  the game, blended with 1,000 shots at the pooled league rate.
- The teammate oracle now covers the goalie too: McDavid and Draisaitl agree
  on the opposing starter in all 443 shared games.
- Result: no signal. See §2 and LIMITATIONS #5.
- Also fixed: LIMITATIONS #9 quoted a stale `rest_days` coefficient (−0.052;
  it is −0.081).

---

## 4. Bugs found, and the shapes they belong to

These are worth remembering as *classes*, not incidents.

### The incremental cursor cannot repair history

`update_all.py` only fetches dates newer than the newest it already has. A row
written wrong stays wrong forever. Two such rows survived four phases of work in
McDavid's log (the one data file older than the pipeline):

- **19 games spelled the opponent `VEG`** where the standings table says `VGK`.
  Those rows joined no `opp_ga_per_game`, so `_prepare` silently dropped them:
  the model had been training on **444 games instead of 463, with every Vegas
  game missing**.
- **13 games carried impossible scores**, including a 2–2 win, where the stored
  score omitted the deciding goal.

Fixed by `python3 data/build/update_all.py --rebuild mcdavid`. **The `--rebuild`
flag exists for exactly this** — reach for it whenever a stored row is suspect.
Every McDavid points/goals/assists/plus-minus value was byte-identical before
and after; only the join key and the scores changed.

### Teammates are a free correctness oracle

Both bugs above were found by cross-checking McDavid against Draisaitl: same
team, so every shared game **must** agree on `result`, both scores, and
`opponent`. After the repair all 443 shared games agree. Any two same-team
players in the registry can be checked this way — run it after adding a player
or touching the fetchers.

```python
import pandas as pd
m = pd.read_csv('data/mcdavid_nhl_log.csv')
d = pd.read_csv('data/draisaitl_nhl_log.csv')
j = m.merge(d, on='date', suffixes=('_m','_d'))
for col in ['result','team_score','opp_score','opponent']:
    print(col, int((j[f'{col}_m'] != j[f'{col}_d']).sum()))   # all must be 0
```

### The season rollover opens a two-month pre-season hole

`seasons.py` rolls over in **August**; the NHL opens in **October**. In between,
the pipeline asks for standings of a season with zero games played. The
"fail loudly on a short fetch" guard treated that as an outage and killed the
whole run — correct for a real outage, wrong for two months every year. Now a
*current* season with exactly zero teams is skipped; a past season, or any
season with some-but-not-enough, still raises.

### `plotly.js-basic-dist-min` silently ignores `tickformat`

The basic bundle ships without d3-format. It accepts `tickformat` into the
layout, reports it back in `_fullLayout`, and ignores it at render — zero was
displaying as `−8.881784197001253e−17`. `dropLayout` in `web/lib/charts.ts`
computes explicit `tickvals`/`ticktext` instead. **Do not use `tickformat`
anywhere in this project.**

---

## 5. How to run things

```bash
# Refresh data + rebuild the web bundle (does both steps)
bash scripts/run_update.sh

# Or separately
python3 data/build/update_all.py                     # incremental, every player
python3 data/build/update_all.py --rebuild mcdavid   # re-fetch one player in full
python3 data/build/update_all.py --rebuild           # re-fetch everyone
python3 data/build/export_web.py --verify            # -> web/public/data.json, cross-checks the Streamlit model

# The site
cd web && npm run dev            # http://localhost:3000
cd web && npm run build          # static export into web/out

# The Streamlit fallback
streamlit run app/Home.py

# Notebooks (01-03 read CSVs only; 04 hits the API)
cd notebooks && python3 -m nbconvert --to notebook --execute --inplace \
  --ExecutePreprocessor.timeout=900 01_data_loading_and_exploration.ipynb
```

Publishing: push to `main`. Vercel rebuilds automatically. In season, the daily
GitHub Action does the refresh-and-push itself; check its runs under the
repo's Actions tab before refreshing by hand.

```bash
python3 data/build/check_data.py   # what the Action runs before it publishes
```

```bash
bash scripts/run_update.sh
git add data web/public/data.json
git commit -m "data: refresh" && git push
```

### Verification worth running before claiming anything works

- `python3 data/build/export_web.py --verify` — the exporter and
  `app/components/model.py` duplicate the model; this asserts they agree.
- The teammate cross-check in §4.
- `cd web && npm run build` — typechecks and prerenders all 6 routes.
- Streamlit pages actually execute (a 200 from the HTTP route proves nothing;
  the script only runs when a client connects over the websocket):

```python
from streamlit.testing.v1 import AppTest
for p in ["app/Home.py", "app/pages/1_Three_Acts.py", "app/pages/2_Peer_Comparison.py",
          "app/pages/3_Feature_Contributions.py", "app/pages/4_Limitations.py",
          "app/pages/5_Pipeline_Status.py"]:
    at = AppTest.from_file(p, default_timeout=180).run()
    print(p, len(at.exception))   # all must be 0
```

---

## 6. Environment gotchas

### There are two Vercel projects and only one works

The repo is connected to both:

- **`variance97`** (`prj_GlE2UxEGC4paCbOjbIfIYUMBk3Ph`) — the real one. Root
  Directory `web`. Serves the live URL.
- **`web`** (`prj_dzh1hE1pyeU39WifiPNh8oMmtDLc`) — a stray created minutes after
  the first, no Root Directory set. **Every deployment it has ever had is in
  ERROR** ("No Next.js version detected"). Nothing is aliased to it.

Two consequences: checking deploy health against the first project that matches
the repo shows a wall of failures and suggests the site is broken when it is
fine; and `web/.vercel/project.json` points at the **stray**, so a local
`vercel deploy` from `web/` targets the broken project. Deleting the stray is
safe and has not been done — it needs the user's say-so.

Org/team: `team_SgwkUbBawlwgy8WQTEpLHDP5`.

### Screenshots of `/peer-comparison` time out

The Playwright MCP screenshot tool has a fixed ~5s cap; that page has two Plotly
charts plus web fonts and does not finish in time. This is **not** a page bug —
verified zero mutations and stable geometry. Chart correctness there was checked
programmatically instead (marker positions, tick text, sort order, no overflow
at 420px). **Nobody has actually looked at that page rendered.** Worth a human
glance.

### Notebook hygiene

`nbconvert --execute --inplace` writes cells without `id` fields and warns. Run
`nbformat.validator.normalize()` afterwards (as the recent commits did) to keep
the diffs clean.

### Prettier is not the repo's formatter

Running `npx prettier --write` on a `.tsx` file reflows prose in untouched JSX
and produces a large noise diff. Edit by hand.

---

## 7. What's next

In the order agreed with Kylan, with the first item now done.

1. ~~**Peer distribution (LIMITATIONS #3)**~~ — done, `dce542d`.
2. ~~**Goalie features (LIMITATIONS #5)**~~ — done, `feat/goalie-features`. No
   signal. High-danger save% is not in the NHL API; it moved to item 4.
3. ~~**Daily pipeline GitHub Action**~~ — done, `.github/workflows/update-data.yml`.
   Daily at 14:00 UTC: `update_all` → `check_data` → `export_web --verify` →
   commit and push only if a CSV changed. Two supporting changes: the Pipeline
   Status page now dates files by last git commit (a CI checkout resets every
   mtime), and `check_data.py` automates the teammate oracle plus score, date,
   enrichment and opponent-join checks, so a bad fetch cannot auto-publish.
   **Known upkeep:** GitHub disables scheduled workflows after 60 days with no
   commits, and the offseason is longer — re-enable it each autumn. Each run
   also refetches ~36 goalie-seasons with no games (pre-NHL seasons), which
   leave no rows to cache; harmless, ~70 calls. — the repo has **no `.github/` directory at
   all**. The Phase 5 plan listed this as a stretch and it was never built. The
   2026-27 season opens next month, and `seasons.py` plus the pre-season fix are
   now ready for a cron that runs through the rollover.
4. **Advanced metrics (LIMITATIONS #4 and #7)** — Natural Stat Trick or
   MoneyPuck for on-ice GF/60, xG, scoring chances. The only route that makes H2
   testable at all, and the "Phase 6" the original plans pointed at.

Smaller, open:

- `opp_ga_per_game` is an end-of-season snapshot, not game-date specific
  (LIMITATION #8). Rolling trailing-N GA/game is minor engineering.
- `rest_days` is computed from McDavid's game gaps, not Edmonton's schedule
  (LIMITATION #9). Now matters slightly more than it did — the coefficient moved
  from a bogus −0.008 to a real −0.08 once the offseason stopped counting as
  rest.
- International team strength is unmodelled, which is why Phase 3 is NHL-only
  (LIMITATION #6).

Done and no longer worth looking for: `data/mcdavid_game_log.csv` and
`web/lib/narrative.tsx` were both dead and are deleted.

---

## 8. Where things live

Beyond `README.md`'s structure section, the things that are easy to miss:

| Thing | Where |
| --- | --- |
| The player registry — **the single source of the player list** | `data/build/fetch_player_log.py` (`PLAYERS`, `SUBJECT`, `PEER_KEYS`) |
| Season maths, derived from the clock | `data/build/seasons.py` |
| The model, twice (kept in sync by `--verify`) | `data/build/export_web.py::prepare` and `app/components/model.py::_prepare` |
| Chart palette + provenance comments | `web/lib/charts.ts` (top-of-file docstring) |
| Chart color tokens | `web/app/globals.css` (`--c-mcdavid`, `--c-peer`, …) |
| Peer page figures | `web/app/peer-comparison/DropDistribution.tsx`, `PeerExplorer.tsx` |
| Streamlit peer mirror | `app/pages/2_Peer_Comparison.py` |

Adding a peer is a registry entry and nothing else — the orchestrator, the
exporter and the Pipeline Status file list all derive their lists from `PLAYERS`.
Then run `update_all.py` and `export_web.py`.

The `web/AGENTS.md` / `web/CLAUDE.md` pair is regenerated by `next dev`; commit
it with your work rather than fighting it.
