# Variance97

Data science investigation of Connor McDavid's performance in high-stakes hockey across the NHL Stanley Cup Playoffs (2021–22 through 2025–26), the 2025 Four Nations Face-Off, and the 2026 Winter Olympics.

> **Picking this up after a break?** [`TRACING.md`](TRACING.md) is the continuity
> document: current state, what changed recently and why, the bugs that are worth
> knowing about as classes rather than incidents, and what to do next. This file
> explains what the project is; that one explains where it stands.

## The question, narrowed

The popular narrative is that Connor McDavid can't win the big one. The data tells a more specific story:

- McDavid **won** the 2025 Four Nations Face-Off, scoring the OT winner himself in the final.
- McDavid **set the Olympic scoring record** with 13 points in 6 games at the 2026 Milan Cortina Games.
- McDavid's individual Stanley Cup Finals production drops about **0.28 pts/game** vs his regular season — which means nothing until it is compared. Measured against five elite centres of the same era, **McDavid is mid-pack**: of the three who reached a Final in this window, MacKinnon (−0.54, and he won the Cup) and Draisaitl (−0.61) fell further, while Jack Eichel (+0.00) did not fall at all.

So the working thesis isn't "McDavid underperforms in championship-level games." It's narrower: **his teams keep losing deep playoff runs even when his individual production isn't unusually low for an elite forward.** The project tests where the predictive signal actually lives, against three hypotheses:

1. **H1 — Individual:** McDavid's personal output collapses in championship-level games.
2. **H2 — Team Construction:** Edmonton's supporting cast fails around him.
3. **H3 — Matchup-Specific:** elite goaltender + elite defensive system specifically suppresses him (Bobrovsky/FLA, Hellebuyck/USA).

### The 2025–26 first round, stated up front

The newest series in the dataset is the one that fits the reframing worst, so it is named here rather than left to average out. Edmonton lost the 2025–26 first round to Anaheim 2–4, and McDavid scored **1.00 pts/game against a 1.67 regular-season rate** at **−8** — a drop of 0.67, larger than his Stanley Cup Finals drop and larger than MacKinnon's. Of the 14 playoff series in the window it is his lowest-scoring and his worst by plus/minus.

It is six games against one opponent, so it does not overturn a comparison built on 13 Finals games; and unlike the Finals rows it carries no Florida confound. It is a genuine counterexample at n=6, and the site says so on the home page and in Act I rather than burying it in a pooled first-round mean.

## What each phase actually does

### Phase 1 — Exploratory Data Analysis (`01_data_loading_and_exploration.ipynb`)
Three acts (Stanley Cup Playoffs / Four Nations / Olympics) plus a synthesis section that adds **a peer comparison against Nathan MacKinnon** and explicitly documents the two structural confounds in the dataset (every Edmonton Stanley Cup Finals appearance is vs Florida; the Hellebuyck sample is n=3 across one tournament window). The takeaway: H1 is weakened by peer comparison, H3 is the best-fitting hypothesis but cannot be statistically isolated from confounds without more data.

### Phase 2 — Statistical Validation (`02_statistical_validation.ipynb`)
Four formal tests with **effect sizes (Cohen's d) alongside p-values** and **Bonferroni correction (k=4 → α=0.0125)**. Includes a peer-comparison test (McDavid SCF vs MacKinnon SCF) that the original version was missing. None of the tests reach significance — the dataset is structurally underpowered (n=3 to n=13 for the playoff/championship contexts) — and we no longer use "trending toward significance" framing. The peer-comparison non-result is itself informative: McDavid's SCF output is *higher* than MacKinnon's, directly contradicting the popular thesis.

### Phase 3 — Feature Attribution (`03_ml_model.ipynb`)
Reframed from "logistic regression predicting pointless games" to **Ridge regression on points/game with real gameplay features**: `opp_ga_per_game`, `rolling_pts_5`, `rest_days`, `is_back_to_back`. Scoped to NHL games only. The result that matters: when `game_context_stanley_cup_finals` has to compete against gameplay features instead of standing alone, **its coefficient drops from +0.67 (original) to +0.051** — near zero, and pointing the opposite way to the narrative. The variance the original model attributed to "Stanley Cup Finals" reroutes to `game_number` (late-series fatigue) and `opp_ga_per_game` (opponent quality).

The model trains on 463 games. It used to train on 444: nineteen games against Vegas were being silently dropped, because McDavid's log — the one file predating the API pipeline — spelled the opponent `VEG` while the standings table says `VGK`, so those rows joined no opponent strength and `_prepare` discarded them. That log also carried thirteen games with impossible scores (a 2–2 win). Both were repaired by re-fetching it from the API; see Phase 4.

Context is categorical, so one level is the baseline and carries no column: that level is `regular_season`, pinned explicitly in `_prepare` rather than left to `get_dummies` to pick. Every `game_context_*` coefficient is therefore a difference from an average regular-season game. `rest_days` and `rolling_pts_5` reset at each season boundary, so a 150-day offseason is never counted as rest or as recent form. The "Stanley Cup Finals effect" was largely a late-series + tough-defense effect masquerading as a context label.

### Phase 4 — NHL API Pipeline (`04_nhl_api_pipeline.ipynb`)
Self-updating dataset off `api-web.nhle.com`. `data/build/update_all.py` orchestrates: cursor-based incremental fetch of every registry player's `gameLog`, per-new-game boxscore enrichment (so `result`/`team_score`/`opp_score` are populated), standings refresh into `opponent_team_stats.csv`, concat of the manual `international_games.csv`, and a full re-run of `apply_features.py` so `is_elimination_game`, `rolling_pts_5`, `rest_days`, `is_back_to_back`, and `opp_ga_per_game` stay consistent with the latest rows. Idempotent — reruns with no new games report `+0` and exit cleanly, so it's safe on a daily cron.

```bash
python3 data/build/update_all.py                  # incremental, every player
python3 data/build/update_all.py --rebuild mcdavid  # re-fetch one player in full
```

`--rebuild` exists because the incremental path is cursor-based: it only ever looks at dates newer than the newest it already has, so a row written wrong stays wrong forever. That is not hypothetical — it is how McDavid's `VEG`/`VGK` and impossible-score rows survived four phases of work. Passing no names rebuilds everyone.

Which side of a boxscore is "the player's team" is decided by elimination against the opponent in the row, not by a per-player team abbreviation, so a mid-season trade needs no special handling.

### Phase 5 — Interactive Dashboard (`web/`, with `app/` as fallback)
Six-page dashboard built around the reframed thesis, not a point-prediction toy. It opens with the headline (Four Nations win, Olympic record, and McDavid mid-pack in the peer distribution). Pages: **Three Acts** (Playoffs / Four Nations / Olympics, interactive), **Peer Comparison** (the strongest finding: where McDavid's Finals decline sits in a five-peer distribution, plus a head-to-head against any one of them), **Feature Contributions** (per-game Ridge coefficient × standardized feature decomposition — explicitly *not* a "will-he-score-tonight" predictor), **Limitations** (Florida confound, Hellebuyck n=3), and **Pipeline Status** (latest game date, row count, CSV mtime).

The dashboard exists in two forms, both driven by the same clean CSVs. No API calls happen from either — Phase 4 owns all external I/O.

- **`web/` — the deployed site (Next.js, static).** What's live. Every number, including the Ridge fit, is precomputed at build time by `data/build/export_web.py`, so the site is pure static files: no Python at request time and no cold start.
- **`app/` — the original Streamlit app.** Kept as a working local view and as the contingency path if the hosted site is ever unavailable. `export_web.py --verify` cross-checks its model against the exported one, so the two can't silently drift.

## Data

The dataset is built and refreshed by the Phase 4 pipeline (`data/build/`). Sources of truth are the API-derived NHL logs and the manual international file; everything else is regenerated each pipeline run.

| File | Source | Description |
| --- | --- | --- |
| `data/mcdavid_nhl_log.csv` | NHL API | NHL-only McDavid game log. Rebuilt incrementally by the pipeline. |
| `data/<peer>_nhl_log.csv` | NHL API | One per peer — `mackinnon`, `draisaitl`, `eichel`, `matthews`, `crosby`. Same pipeline, same schema. |
| `data/international_games.csv` | Manual entry | Four Nations / Olympics rows — the NHL API doesn't cover these. |
| `data/opponent_team_stats.csv` | NHL API standings | Per-season GA/game for every team. Refreshed each pipeline run. |
| `data/mcdavid_game_log_clean.csv` | Pipeline output | Merged + featured (NHL + international). Consumed by Phases 1–3. |
| `data/<peer>_game_log_clean.csv` | Pipeline output | Featured (NHL only), one per peer. Consumed by the peer comparison. |

### The peer group

The comparison rests on five elite centres of the same era, all pulled through the same pipeline. They are declared in `data/build/fetch_player_log.PLAYERS`, and adding another is a registry entry and nothing else — the orchestrator, the exporter and the Pipeline Status page all derive their lists from it.

| Player | Finals in window | Why they are in the group |
| --- | --- | --- |
| Nathan MacKinnon | 2022 (won) | The original peer. Same era, similar usage. |
| Leon Draisaitl | 2024, 2025 | A within-team control, not an independent peer: the same two series, the same opponent, the same supporting cast. |
| Jack Eichel | 2023 (won), 2026 | The only peer with two Finals against different opponents — and the only one to have faced the Panthers team McDavid is confounded with. |
| Auston Matthews | none | No Final in the window; contributes to the earlier rounds only. |
| Sidney Crosby | none | The thinnest record here, kept deliberately — dropping a peer for a short playoff record after seeing it is how a comparison group gets curated. |

### `is_elimination_game` rule
A game is an elimination game if a single loss ends the run:

- **NHL playoff series:** `True` when the opponent already has 3 series wins entering the game.
- **International knockout games** (quarterfinals, semifinals, finals): always `True`.
- Regular season, group stage, exhibition: always `False`.

Rule logic lives in `data/build/apply_features.py`; results are materialized into the clean CSVs.

## Refreshing the dataset

```bash
bash scripts/run_update.sh           # one-shot CLI wrapper
# or, equivalently:
python3 data/build/update_all.py     # 1. refresh the CSVs from the NHL API
python3 data/build/export_web.py     # 2. recompute web/public/data.json
```

Step 2 matters: the deployed site reads the committed `web/public/data.json`, not the CSVs. Refreshing the CSVs without re-exporting leaves the site showing stale numbers. `scripts/run_update.sh` does both.

Publish a refresh:

```bash
bash scripts/run_update.sh
git add data web/public/data.json
git commit -m "data: refresh" && git push   # push triggers the redeploy
```

Idempotent — running with no new games reports `+0` and exits cleanly. Safe to put on a daily cron during the season.

## Live dashboard

Phase 5 ships an interactive dashboard built around the reframed thesis. It does not predict whether McDavid will go pointless tonight — that would oversell what the data supports. Instead it surfaces the headline finding (peer comparison vs MacKinnon), the three-act narrative, per-game feature contributions from the Phase 3 model, and the limitations.

- **Live URL:** https://variance97.vercel.app

The site is a static export served from a CDN — there is no server to wake up and no cold start.

### Deployment

Hosted on Vercel, connected to this repo (project `variance97`, Root Directory `web`, production branch `main`). Pushing to `main` rebuilds and redeploys automatically. To deploy by hand instead:

```bash
cd web && npx vercel deploy --prod
```

### Run the site locally

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

`web/public/data.json` is committed, so the site builds without Python. Regenerate it after a data refresh with `npm run data` (or the pipeline wrapper below).

### Run the Streamlit fallback

Kept as the contingency path and for local iteration on the analysis:

```bash
pip install -r requirements.txt
streamlit run app/Home.py
```

Both read the same clean CSVs from `data/`. Phase 4's pipeline keeps those fresh.

## Tech stack

- Python (`pandas`, `numpy`, `scipy`, `scikit-learn`)
- Jupyter (analysis notebooks)
- Next.js (static export) + Plotly.js (deployed dashboard), hosted on Vercel
- Streamlit + Plotly (fallback dashboard)
- NHL public API (`api-web.nhle.com`)

## Repository structure

```
data/
    build/
        fetch_player_log.py        # gameLog fetcher + the player registry
        fetch_boxscores.py         # adds result/team_score/opp_score
        fetch_team_stats.py        # NHL standings -> team GA/game
        apply_features.py          # is_elimination_game + ML features
        seasons.py                 # season ids/labels, derived from the clock
        update_all.py              # pipeline orchestrator
        export_web.py              # -> web/public/data.json (build-time bundle)
    <player>_nhl_log.csv           # API source, one per registry player
    <player>_game_log_clean.csv    # pipeline output (analysis input)
    international_games.csv        # manual entry (McDavid only)
    opponent_team_stats.csv        # team GA/game by season
notebooks/
    01_data_loading_and_exploration.ipynb
    02_statistical_validation.ipynb
    03_ml_model.ipynb
    04_nhl_api_pipeline.ipynb      # Phase 4 pipeline demo
web/                               # deployed dashboard (Next.js static export)
    app/                           # one directory per page + layout
    components/                    # Plot wrapper, tabs, UI primitives
    lib/                           # typed data access, chart builders, prose
    public/data.json               # build-time bundle (committed)
app/                               # Streamlit fallback dashboard
    Home.py                        # entry point (headline)
    pages/                         # Three Acts, Peer Comparison, ...
    components/                    # data loaders, charts, model, narrative
.streamlit/config.toml             # theme + server config
scripts/
    run_update.sh                  # CLI wrapper for cron / CI
requirements.txt
TRACING.md                         # continuity / session handoff
LIMITATIONS.md
PHASE4_PLAN.md
PHASE5_PLAN.md
README.md
```

## Honest summary

The project's most interesting finding is the one that contradicts its own original framing: **McDavid's individual Stanley Cup Finals production is not unusually low for an elite forward** — measured against a five-peer group he lands mid-pack, with MacKinnon (who won) and his own linemate Draisaitl both falling further. The peer expansion also cost the project its tidier claim: "his decline is half a comparable peer's" was an artifact of comparing him to one peer. Where the predictive signal *does* live, once real gameplay features are introduced, is **late-in-series fatigue (`game_number`) and opponent defensive quality (`opp_ga_per_game`)** — not the "championship" label. That is the narrower, defensible claim Phase 4's pipeline keeps fresh and Phase 5's dashboard puts in front of a reader inside 30 seconds.
