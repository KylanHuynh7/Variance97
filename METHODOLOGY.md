# Methodology

Everything Variance97 does, how it does it, and why each choice was made.

This file only grows. When a decision changes, the old one is marked as
superseded with its reason, not deleted, so the reasoning stays traceable. Other
documents answer other questions:

| Document | Answers |
| --- | --- |
| `README.md` | What the project is, and how to run it |
| `METHODOLOGY.md` | How it works, and why every choice was made |
| `AGENDA.md` | Where the last session stopped, and what comes next |
| `LIMITATIONS.md` | What the analysis cannot claim |

Commit messages carry the full reasoning for each change. This file is the
map to them.

---

## 1. The question

The popular claim is "Connor McDavid can't win the big one." The project tests
it against three hypotheses:

1. **H1 — Individual:** his personal output collapses in championship games.
2. **H2 — Team construction:** Edmonton's supporting cast fails around him.
3. **H3 — Matchup:** an elite goaltender plus an elite defensive system
   suppresses him (Bobrovsky/Florida, Hellebuyck/USA).

The window is the 2021-22 through 2025-26 NHL seasons, plus the 2025 Four
Nations Face-Off and the 2026 Olympics.

### Where the evidence stands

The thesis has narrowed several times, in both directions. Each change is
listed here with the work that caused it.

| Finding | Status | Source |
| --- | --- | --- |
| He won the 2025 Four Nations (OT winner) and set the Olympic scoring record (13 pts in 6 games) | Holds | Phase 1 |
| His Finals decline is mid-pack among five elite centres | Holds | Peer distribution, `dce542d` |
| ~~His decline is half a comparable peer's~~ | **Retracted.** True of MacKinnon alone; Eichel did not decline at all | Peer distribution, `dce542d` |
| The "Stanley Cup Finals" label carries almost no signal once gameplay features compete (+0.051) | Holds | Phase 3 |
| Signal lives in late-series `game_number` (−0.28) and opponent defence `opp_ga_per_game` (+0.09) | Holds | Phase 3 |
| The opposing goalie's save% carries no signal (−0.010) | Holds, with a shot-quality caveat | Goalie features, `74b4e14` |
| The 2025-26 first round (1.00 pts/game vs a 1.67 rate, −8) runs against the thesis | Stated openly, n=6 | `a7ab0b3` |

Regular season to Stanley Cup Finals, points per game:

| Player | RS | Finals | Change | n |
| --- | --- | --- | --- | --- |
| Eichel | 1.09 | 1.09 | +0.00 | 11 |
| **McDavid** | **1.67** | **1.38** | **−0.28** | **13** |
| MacKinnon | 1.54 | 1.00 | −0.54 | 6 |
| Draisaitl | 1.45 | 0.85 | −0.60 | 13 |

The supported claim: *his individual production in deep runs is not unusually
low for an elite forward, but his teams keep losing those runs; the predictive
signal lives in late-series context and opponent defence, not in the
championship label or in who was in goal.*

---

## 2. Data

### Sources

| Data | Source | Why this source |
| --- | --- | --- |
| NHL game logs | `api-web.nhle.com/v1/player/{id}/game-log` | Public, no key, per-game stats |
| Result, scores, opposing starter | `/v1/gamecenter/{gameId}/boxscore` | The game log omits them |
| Opposing goalies' own games | `/v1/player/{goalieId}/game-log` | Needed for a save% measured *before* each game |
| Team goals against per game | `/v1/standings/{date}` | Opponent defensive strength |
| Four Nations and Olympic games | Entered by hand in `international_games.csv` | The NHL API does not cover them, and scraping event pages breaks unpredictably. It is a handful of games every few years. |

High-danger save%, expected goals and on-ice metrics are **not** in the NHL
API. They need Natural Stat Trick or MoneyPuck (LIMITATIONS #4).

### The peer group

Six players live in one registry, `PLAYERS` in `data/build/fetch_player_log.py`.
It is the single source of the player list: the orchestrator, the exporter and
the Pipeline Status page all derive from it, so adding a peer is one entry.

- **Selection rule:** elite centres of the same era with comparable role and
  usage, **chosen before their numbers were examined**.
- **No peer is dropped after the fact.** Matthews and Crosby reached no Final
  in the window and stay in: dropping a peer for a short playoff record is how
  a comparison group gets quietly curated.
- **Draisaitl is a within-team control, not an independent draw.** He played
  the same Finals as McDavid. That makes him the cleanest available separation
  of individual from team, and it is why he is **excluded from Phase 2's pooled
  peer t-test**, which needs independent samples.
- **Eichel is the only peer to have faced the Florida confound.** He beat the
  same Panthers core in the 2023 Final at 1.60 pts/game. That rules out the
  general form of H3 ("Florida suppresses every elite centre"). It does not
  disentangle anything in Edmonton's rows.

*Superseded:* MacKinnon was the only peer until `dce542d`. The single-peer
headline did not survive the generalisation.

---

## 3. Pipeline

`data/build/update_all.py` orchestrates the whole refresh, in order:

1. Fetch new games per player.
2. Enrich them from boxscores.
3. Fetch opposing goalie logs.
4. Refresh standings.
5. Recompute every derived feature from scratch.

### Choices

- **Incremental by date cursor.** Each run fetches only dates newer than the
  newest stored row, which makes it idempotent and cheap for a daily run.
  *Consequence:* a row written wrong is never revisited. That is what
  `--rebuild [player]` is for (see §8).
- **Stale rows are retried.** A row missing its `result` or its opposing goalie
  counts as stale and is re-enriched on the next run, so a single network blip
  is not permanent. The same mechanism backfilled every player's history when
  the goalie columns were added, with no special migration.
- **The player's side of a boxscore is found by elimination.** The opponent is
  known from the player's own log, so the player's team is the other side. A
  mid-season trade needs no special handling.
- **Fail loudly, write nothing.** A standings fetch that fails, or returns
  fewer than 28 teams, raises. Standings and goalie-log files are written via a
  temp file and an atomic replace. A short file is more dangerous than no file:
  it silently removes games from the model.
- **Seasons derive from the clock.** `seasons.py` rolls over in August, so a new
  season needs no code change. *Superseded:* a hardcoded list that ended at
  2025-26 would have stopped fetching silently.
- **Pre-season exemption.** From August until the October opener, the current
  season legitimately has zero teams with games played. That one case, a
  current season with exactly zero teams, is skipped rather than treated as an
  outage.
- **Historical standings use fixed snapshot dates** (`KNOWN_SNAPSHOTS`), so
  re-running reproduces the same numbers.
- **Goalie logs are cached by (goalie, season).** Finished seasons are never
  refetched; the current season always is. A past season with no games (a
  goalie's pre-NHL year) leaves no rows to remember it by, so it is asked for
  again each run: about 36 pairs, which is cheap and not worth a manifest file.

---

## 4. Features

Every derived column is rebuilt from scratch on every run in
`data/build/apply_features.py`.

| Feature | Definition | Why it is built this way |
| --- | --- | --- |
| `is_elimination_game` | NHL: the opponent already has 3 series wins. International knockouts: always. Otherwise false. | A rule, not hand-labelling, so new games are flagged automatically |
| `rest_days` | Days since the previous game **in the same season** | *Superseded:* computed across seasons, the offseason counted as 107–150 days of rest, inflated the SD from 1.27 to 11.69 and flattened the coefficient toward zero |
| `is_back_to_back` | `rest_days <= 1` | |
| `rolling_pts_5` | Mean points over the previous 5 games in the season, shifted by one | The shift prevents leakage from the game itself; the season reset keeps June's form out of October |
| `opp_ga_per_game` | Opponent's goals against per game from season standings | Team defence, system and goalie combined. A season snapshot, not as of the game date (LIMITATIONS #8) |
| `opp_goalie_sv_pct` | Opposing starter's save% over the **365 days strictly before** the game, blended with **1,000 shots** at the pooled league rate for the same window | See below |

### Why `opp_goalie_sv_pct` is built the way it is

- **Measured strictly before the game.** A goalie's season save% includes the
  game being predicted, which is leakage.
- **A 365-day window, not season-to-date.** An October start still has a year
  of history behind it.
- **Shrunk toward the league rate.** Save% is among the noisiest rates in
  hockey. Without shrinkage, a backup's hot fortnight reads as elite. The prior
  of 1,000 shots was fixed before looking at the outcome.
- **Sensitivity checked, not tuned.** At 0, 300, 1,000 and 3,000 shots the
  coefficient is +0.027, −0.012, −0.010 and −0.002. A sign that flips with a
  tuning constant is itself the finding: there is no stable effect.
- **The starter, not whoever finished.** The boxscore flags the starter. If the
  flag is missing, the goalie with the most minutes is used, so no row is left
  goalie-less and retried forever.

---

## 5. The model (Phase 3)

Ridge regression on points per game, on standardised features.

| Choice | Why |
| --- | --- |
| **Continuous target (points), not pointless yes/no** | *Superseded:* the original logistic model treated a 0-point 1–0 OT loss the same as a 0-point 5–0 blowout |
| **Real gameplay features alongside context** | *Superseded:* with only `game_context` available, "Stanley Cup Finals" dominated at +0.67, which just rediscovered Phase 1's binning. Once real features compete it is +0.051 |
| **Ridge, alpha 1.0, standardised inputs** | Stable on ~460 correlated rows; coefficient magnitudes are directly comparable; a prediction decomposes exactly into per-feature contributions for the site |
| **NHL games only** | International opponents have no standings-based strength, and a chronological split put those contexts in test with zero training rows (LIMITATIONS #6) |
| **`regular_season` pinned as the dummy baseline** | *Superseded:* `get_dummies(drop_first=True)` had silently made `conf_finals` the baseline, so every context coefficient was a difference from the wrong level |
| **Full refit for the site; chronological 80/20 split in the notebook** | The site reports coefficients (full data); the notebook reports held-out error (a split). Hence +0.051 vs +0.04 for the Finals label |
| **Presented as attribution, never prediction** | Held-out R² is about zero and below the predict-the-mean baseline. The site must not offer a "will he score tonight" widget |

**The model exists twice:** `data/build/export_web.py::prepare` for the static
site and `app/components/model.py::_prepare` for Streamlit. They are duplicated
because the Streamlit module imports streamlit. `export_web.py --verify` asserts
identical feature matrices, coefficients and intercept.

---

## 6. Statistical testing (Phase 2)

- **Effect sizes (Cohen's d) are reported beside every p-value.** At n=3 to 13
  nothing reaches significance, so effect sizes carry the analysis.
- **Bonferroni correction** for 4 tests, α = 0.0125.
- **No "trending toward significance" language.**
- **The peer t-test pools independent peers only** (Draisaitl excluded; see §2).
- **Small samples apply in both directions.** The caveat that protects the
  reframing from being over-read applies equally to the 2025-26 series that
  runs against it.

---

## 7. Publishing

| Choice | Why |
| --- | --- |
| **Static Next.js site on Vercel** (`web/`) | Every number, including the Ridge fit, is precomputed into `web/public/data.json`. No Python at request time, no cold start. *Superseded:* Streamlit Community Cloud, `6776dc7` |
| **Streamlit kept as a fallback** (`app/`) | A working local view and a contingency if hosting fails. Kept in sync by `--verify` |
| **`data.json` is committed** | The site builds without Python; Vercel just runs `next build` |
| **Daily GitHub Action** (`.github/workflows/update-data.yml`) | Runs 14:00 UTC: `update_all` → `check_data` → `export_web --verify`, then commits and pushes **only if a CSV changed**. The push redeploys the site |
| **Push straight to `main`, not a pull request** | Simplest for a single-maintainer project; `check_data.py` is the guard instead of a human review |
| **`check_data.py` gates every publish** | Teammate agreement, results consistent with scores, no unenriched rows, no duplicate or future dates, every NHL row joined to an opponent strength. Verified to catch all the historical bugs when they are re-injected |
| **Pipeline Status dates files by last git commit** | *Superseded:* file modification times, which a CI checkout resets to the checkout minute. A modified, uncommitted file still uses its mtime |

---

## 8. Verification

Run these before claiming anything works:

- `python3 data/build/check_data.py` — the publish gate (§7).
- `python3 data/build/export_web.py --verify` — both model copies agree.
- `cd web && npm run build` — typechecks and prerenders every route.
- Streamlit pages actually executing. An HTTP 200 proves nothing, because the
  script only runs when a client connects:

```python
from streamlit.testing.v1 import AppTest
for p in ["app/Home.py", "app/pages/1_Three_Acts.py", "app/pages/2_Peer_Comparison.py",
          "app/pages/3_Feature_Contributions.py", "app/pages/4_Limitations.py",
          "app/pages/5_Pipeline_Status.py"]:
    print(p, len(AppTest.from_file(p, default_timeout=180).run().exception))  # all 0
```

- **After a pipeline change:** snapshot `data/*.csv` first, then confirm every
  pre-existing column is unchanged afterwards. This is how the goalie backfill
  was verified.

---

## 9. Bug classes worth remembering

Each of these is recorded as a *shape*, because the shapes recur.

### An incremental cursor cannot repair history

Rows written wrong stay wrong. McDavid's log, the one file older than the
pipeline, spelled Vegas `VEG` where standings say `VGK`: **19 games** joined no
opponent strength and were silently dropped from the model (444 games instead
of 463). **13 games** had impossible scores, including a 2–2 win. Fixed with
`update_all.py --rebuild mcdavid`. Every points value was byte-identical before
and after.

### Teammates are a free correctness oracle

Same team means every shared game must agree on result, both scores, opponent
and opposing goalie. Checking McDavid against Draisaitl found both bugs above.
This check is now automated in `check_data.py`.

### Guards for "fail loudly" need their legitimate exceptions

The pre-season window (§3) looked exactly like an outage to the short-fetch
guard. Any loud-failure rule has to name the cases that are genuinely empty.

### Silent library no-ops

`plotly.js-basic-dist-min` ships without d3-format. It accepts `tickformat`,
reports it back as set, and ignores it at render: zero displayed as
`−8.881784197001253e−17`. `web/lib/charts.ts` computes explicit `tickvals` and
`ticktext` instead. **Never use `tickformat` in this project.**

### Docs rot in the same way code does

The live site served buggy numbers while the fixes sat unmerged on a branch.
Separately, a single continuity document mixed history with plans and went
stale in two places within one session. That is why this file and
`AGENDA.md` are separate.

---

## 10. Conventions and environment

- **Adding a peer:** one `PLAYERS` entry, then `update_all.py` and
  `export_web.py`. If the peer shares a team with an existing player for the
  whole window, add the pair to `TEAMMATES` in `check_data.py`.
- **Notebooks:** after `nbconvert --execute --inplace`, run
  `nbformat.validator.normalize()` to restore cell ids and keep diffs clean.
- **Prettier is not the repo's formatter.** It reflows JSX prose into noise
  diffs. Edit `.tsx` by hand.
- **`web/AGENTS.md` and `web/CLAUDE.md`** are regenerated by `next dev`. Commit
  them rather than fighting it.
- **Two Vercel projects are connected to the repo.** `variance97`
  (`prj_GlE2UxEGC4paCbOjbIfIYUMBk3Ph`, Root Directory `web`) is the real one.
  `web` (`prj_dzh1hE1pyeU39WifiPNh8oMmtDLc`) is a stray whose every deploy fails
  with "No Next.js version detected". Check deploy health against `variance97`.
  `web/.vercel/project.json` points at the stray, so do not `vercel deploy` from
  `web/`. Team: `team_SgwkUbBawlwgy8WQTEpLHDP5`.
- **Screenshots of `/peer-comparison` time out** under the Playwright MCP's ~5s
  cap. That is two Plotly charts plus fonts, not a page bug. Its charts were
  verified programmatically.
- **Branching:** each piece of work goes on a branch and merges to `main` with
  `--no-ff` and a `Merge: …` summary line. Pushing to `main` deploys.

### Where things live

| Thing | Where |
| --- | --- |
| Player registry | `data/build/fetch_player_log.py` (`PLAYERS`, `SUBJECT`, `PEER_KEYS`) |
| Season maths | `data/build/seasons.py` |
| Feature definitions and goalie constants | `data/build/apply_features.py` |
| Publish gate | `data/build/check_data.py` |
| The model, twice | `data/build/export_web.py::prepare`, `app/components/model.py::_prepare` |
| Chart palette | `web/lib/charts.ts` (docstring), tokens in `web/app/globals.css` |
| Daily refresh | `.github/workflows/update-data.yml` |

---

## 11. Decision log

The dated record of what was done. Newest last. Each entry is one line, and the
commit holds the detail.

| Date | Commit | What changed |
| --- | --- | --- |
| 2026-04 | — | Phase 1 EDA: three acts plus a MacKinnon comparison |
| 2026-05-03 | `9d5eef8` | Phase 2: effect sizes and Bonferroni |
| 2026-05-04 | `86315c9` | Phase 3: Ridge on points with gameplay features, replacing logistic-on-context |
| 2026-05-13 | `1c84cd2` | Phase 4: NHL API pipeline |
| 2026-05-13 | `a844965` | Phase 5: Streamlit dashboard |
| 2026-09-03 | `6776dc7` | Static Next.js site on Vercel replaces Streamlit hosting |
| 2026-09-11 | `478d2d7` | Correctness: atomic standings, clock-derived seasons, boxscore retry, season-reset features, pinned baseline, Olympic labels |
| 2026-09-11 | `a7ab0b3` | The 2025-26 season written into every surface; notebooks reconciled |
| 2026-09-12 | `dce542d` | Five-peer distribution. McDavid mid-pack; "half a peer's decline" retracted; VEG/VGK and impossible-score repairs |
| 2026-09-14 | `74b4e14` | Opposing goalie recorded and tested: no signal |
| 2026-09-14 | `0de3005` | Daily GitHub Action, `check_data.py` publish gate, git-dated Pipeline Status |
| 2026-09-14 | — | `TRACING.md` split into this file and `AGENDA.md` |
