# Variance97

Data science investigation of Connor McDavid's performance in high-stakes hockey across the NHL Stanley Cup Playoffs (2021–22 through 2024–25), the 2025 Four Nations Face-Off, and the 2026 Winter Olympics.

## The question, narrowed

The popular narrative is that Connor McDavid can't win the big one. The data tells a more specific story:

- McDavid **won** the 2025 Four Nations Face-Off, scoring the OT winner himself in the final.
- McDavid **set the Olympic scoring record** with 13 points in 6 games at the 2026 Milan Cortina Games.
- McDavid's individual Stanley Cup Finals production drops about **0.28 pts/game** vs his regular season — but **Nathan MacKinnon's drops twice as much (0.54 pts/game)** and MacKinnon won the Cup in 2022.

So the working thesis isn't "McDavid underperforms in championship-level games." It's narrower: **his teams keep losing deep playoff runs even when his individual production isn't unusually low for an elite forward.** The project tests where the predictive signal actually lives, against three hypotheses:

1. **H1 — Individual:** McDavid's personal output collapses in championship-level games.
2. **H2 — Team Construction:** Edmonton's supporting cast fails around him.
3. **H3 — Matchup-Specific:** elite goaltender + elite defensive system specifically suppresses him (Bobrovsky/FLA, Hellebuyck/USA).

## What each phase actually does

### Phase 1 — Exploratory Data Analysis (`01_data_loading_and_exploration.ipynb`)
Three acts (Stanley Cup Playoffs / Four Nations / Olympics) plus a synthesis section that adds **a peer comparison against Nathan MacKinnon** and explicitly documents the two structural confounds in the dataset (every Edmonton Stanley Cup Finals appearance is vs Florida; the Hellebuyck sample is n=3 across one tournament window). The takeaway: H1 is weakened by peer comparison, H3 is the best-fitting hypothesis but cannot be statistically isolated from confounds without more data.

### Phase 2 — Statistical Validation (`02_statistical_validation.ipynb`)
Four formal tests with **effect sizes (Cohen's d) alongside p-values** and **Bonferroni correction (k=4 → α=0.0125)**. Includes a peer-comparison test (McDavid SCF vs MacKinnon SCF) that the original version was missing. None of the tests reach significance — the dataset is structurally underpowered (n=3 to n=13 for the playoff/championship contexts) — and we no longer use "trending toward significance" framing. The peer-comparison non-result is itself informative: McDavid's SCF output is *higher* than MacKinnon's, directly contradicting the popular thesis.

### Phase 3 — Feature Attribution (`03_ml_model.ipynb`)
Reframed from "logistic regression predicting pointless games" to **Ridge regression on points/game with real gameplay features**: `opp_ga_per_game`, `rolling_pts_5`, `rest_days`, `is_back_to_back`. Scoped to NHL games only. The result that matters: when `game_context_stanley_cup_finals` has to compete against gameplay features instead of standing alone, **its coefficient drops from +0.67 (original) to roughly −0.06.** The variance the original model attributed to "Stanley Cup Finals" reroutes to `game_number` (late-series fatigue) and `opp_ga_per_game` (opponent quality). The "Stanley Cup Finals effect" was largely a late-series + tough-defense effect masquerading as a context label.

### Phase 4 — NHL API Pipeline (`04_nhl_api_pipeline.ipynb`)
Self-updating dataset off `api-web.nhle.com`. `data/build/update_all.py` orchestrates: cursor-based incremental fetch of McDavid + MacKinnon `gameLog`, per-new-game boxscore enrichment (so `result`/`team_score`/`opp_score` are populated), standings refresh into `opponent_team_stats.csv`, concat of the manual `international_games.csv`, and a full re-run of `apply_features.py` so `is_elimination_game`, `rolling_pts_5`, `rest_days`, `is_back_to_back`, and `opp_ga_per_game` stay consistent with the latest rows. Idempotent — reruns with no new games report `+0` and exit cleanly, so it's safe on a daily cron.

### Phase 5 — Interactive Dashboard (`app/`)
Multi-page Streamlit app built around the reframed thesis, not a point-prediction toy. `Home.py` opens with the headline (Four Nations win, Olympic record, McDavid's SCF drop is smaller than MacKinnon's). Pages: `1_Three_Acts` (Playoffs / Four Nations / Olympics, interactive), `2_Peer_Comparison` (the strongest finding, McDavid vs MacKinnon by context), `3_Feature_Contributions` (per-game Ridge coefficient × standardized feature decomposition — explicitly *not* a "will-he-score-tonight" predictor), `4_Limitations` (Florida confound, Hellebuyck n=3), and `5_Pipeline_Status` (latest game date, row count, CSV mtime). The app only reads the clean CSVs — no API calls happen from the app itself; Phase 4 owns all external I/O.

## Data

The dataset is built and refreshed by the Phase 4 pipeline (`data/build/`). Sources of truth are the API-derived NHL logs and the manual international file; everything else is regenerated each pipeline run.

| File | Source | Description |
| --- | --- | --- |
| `data/mcdavid_nhl_log.csv` | NHL API | NHL-only McDavid game log. Rebuilt incrementally by the pipeline. |
| `data/mackinnon_nhl_log.csv` | NHL API | NHL-only MacKinnon game log (peer baseline). Rebuilt incrementally by the pipeline. |
| `data/international_games.csv` | Manual entry | Four Nations / Olympics rows — the NHL API doesn't cover these. |
| `data/opponent_team_stats.csv` | NHL API standings | Per-season GA/game for every team. Refreshed each pipeline run. |
| `data/mcdavid_game_log_clean.csv` | Pipeline output | Merged + featured (NHL + international). Consumed by Phases 1–3. |
| `data/mackinnon_game_log_clean.csv` | Pipeline output | Merged + featured (NHL only). Consumed by Phases 1–2. |

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
python3 data/build/update_all.py
```

Idempotent — running with no new games reports `+0` and exits cleanly. Safe to put on a daily cron during the season.

## Live dashboard

Phase 5 ships an interactive Streamlit dashboard built around the reframed thesis. It does not predict whether McDavid will go pointless tonight — that would oversell what the data supports. Instead it surfaces the headline finding (peer comparison vs MacKinnon), the three-act narrative, per-game feature contributions from the Phase 3 model, and the limitations.

- **Live URL:** *(https://variance97-s26u7gyazbqesy5jvmhggw.streamlit.app/)*

### Run locally

```bash
pip install -r requirements.txt
streamlit run app/Home.py
```

The app reads the clean CSVs from `data/` directly — no API calls happen from the app itself. Phase 4's pipeline keeps those CSVs fresh.

## Tech stack

- Python (`pandas`, `numpy`, `scipy`, `scikit-learn`)
- Jupyter (analysis notebooks)
- Streamlit + Plotly (dashboard)
- NHL public API (`api-web.nhle.com`)

## Repository structure

```
data/
    build/
        fetch_player_log.py        # generic NHL gameLog fetcher
        fetch_boxscores.py         # adds result/team_score/opp_score
        fetch_team_stats.py        # NHL standings -> team GA/game
        apply_features.py          # is_elimination_game + ML features
        update_all.py              # pipeline orchestrator
    mcdavid_nhl_log.csv            # API source
    mackinnon_nhl_log.csv          # API source
    international_games.csv        # manual entry
    opponent_team_stats.csv        # team GA/game by season
    mcdavid_game_log_clean.csv     # pipeline output (analysis input)
    mackinnon_game_log_clean.csv   # pipeline output (analysis input)
notebooks/
    01_data_loading_and_exploration.ipynb
    02_statistical_validation.ipynb
    03_ml_model.ipynb
    04_nhl_api_pipeline.ipynb      # Phase 4 pipeline demo
app/
    Home.py                        # Streamlit entry point (headline)
    pages/
        1_Three_Acts.py
        2_Peer_Comparison.py
        3_Feature_Contributions.py
        4_Limitations.py
        5_Pipeline_Status.py
    components/                    # data loaders, charts, model, narrative
.streamlit/config.toml             # theme + server config
scripts/
    run_update.sh                  # CLI wrapper for cron / CI
requirements.txt
LIMITATIONS.md
PHASE4_PLAN.md
PHASE5_PLAN.md
README.md
```

## Honest summary

The project's most interesting finding is the one that contradicts its own original framing: **McDavid's individual Stanley Cup Finals production is not unusually low for an elite forward** — MacKinnon, who actually won, dropped twice as much. Where the predictive signal *does* live, once real gameplay features are introduced, is **late-in-series fatigue (`game_number`) and opponent defensive quality (`opp_ga_per_game`)** — not the "championship" label. That is the narrower, defensible claim Phase 4's pipeline keeps fresh and Phase 5's dashboard puts in front of a reader inside 30 seconds.
