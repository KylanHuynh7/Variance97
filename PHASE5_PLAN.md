# Phase 5 — Interactive Dashboard Plan

## Goal

Ship a public, interactive dashboard that communicates the reframed analytical story — *not* a point-prediction toy. The original plan was "Streamlit app that predicts whether McDavid goes pointless," but Phase 3 made the predictive limit clear: the model performs at baseline, and a deployed predictor would oversell what the data can support. Phase 5 needs to be honest about what the project actually found, and the project actually found a *narrative* worth showing — peer-vs-McDavid, late-series fatigue, the confounds — not a sharp predictor.

This is also the artifact recruiters and casual visitors will see first. It needs to look polished, communicate the headline finding in under 30 seconds, and let curious readers drill in.

## What Phase 5 produces

- A deployed Streamlit app, public URL (Streamlit Community Cloud is the default — free, GitHub-integrated, simple).
- Five surfaces, organized as a multi-page Streamlit app, each answering one question.
- Auto-refresh when the Phase 4 pipeline updates the underlying CSVs (no API calls from the app itself).
- Embedded narrative — every chart has a 1–2 sentence interpretation next to it, so the page is self-explaining without the notebooks.
- Explicit confound disclosure on a dedicated page, so a casual reader cannot accidentally over-read the conclusions.

## Page-by-page sketch

### 1. `Home.py` — the headline

The page that loads first. Goal: communicate the reframing in under 30 seconds.

- Big-text answer to the popular question ("Can McDavid perform on the big stage?"). The honest version: he won the Four Nations, set the Olympic record, and his Stanley Cup Finals drop is *smaller* than MacKinnon's.
- One peer-comparison chart (McDavid vs MacKinnon points/game by NHL context — same chart from Phase 1 synthesis).
- A dropdown / button to "see how this conclusion was reached" → links to the deeper pages.

### 2. `1_Three_Acts.py` — the contexts

Mirror of Phase 1's three-act structure, made interactive.

- Tab or radio for **Stanley Cup Playoffs / Four Nations / Olympics**.
- Per-context: game-by-game points chart (W=green, L=red bars), summary stats vs regular season baseline, short narrative.
- For NHL: a slider over `game_number` showing the late-series production cliff.
- For Olympics: highlight the gold medal game with annotation.

### 3. `2_Peer_Comparison.py` — the headline finding

Where the strongest result lives. Interactive comparison of McDavid vs MacKinnon (and any future peers added via the `fetch_player_log.PLAYERS` registry — Limitation #3 stretch).

- Multi-select for context (regular season, first round, ..., stanley cup finals).
- Bar chart per player, points/game.
- Side-by-side delta callout: "McDavid: −0.28 pts/game | MacKinnon: −0.54 pts/game."
- Caption: "MacKinnon won the Cup. McDavid hasn't. The individual production drop isn't where the difference lives."

### 4. `3_Feature_Contributions.py` — what predicts a slow night

This is the page that *replaces* the original "predict pointless" plan. Show feature contributions, not predictions.

- Game picker: dropdown of every game in the dataset.
- For the selected game, show:
  - Actual points
  - Model-predicted points
  - Contribution per feature (coefficient × standardized feature value, sorted by magnitude). This is the SHAP-style decomposition without needing SHAP — Ridge with standardized inputs gives this for free.
- Above the picker: a static interpretation chart of all coefficients (same chart Phase 3 produces).
- Explicit disclaimer panel: "This model performs at baseline. Use this page to understand which features carry signed weight in the regression, not to predict tonight's game."

### 5. `4_Limitations.py` — the confounds page

A standalone page so any visitor can see what the project deliberately can't claim. Direct port of `LIMITATIONS.md` formatted for the web. Two priority callouts:

- The Florida ↔ Stanley Cup Finals confound (every Edmonton SCF appearance is vs FLA).
- The Hellebuyck n=3 sample (one tournament window).

This page exists because the project's analytical credibility depends on visitors *not* over-reading the conclusions, and a Streamlit app makes overreach easy if the limitations aren't surfaced as a peer to the findings.

### Optional 6. `5_Pipeline_Status.py` — operational pane

Light page showing:

- Latest game date in `mcdavid_game_log_clean.csv`.
- Total row count.
- "Last refreshed" timestamp from CSV mtime.
- Link to `data/build/update_all.py` source on GitHub.

Useful for proving the dashboard is live, not a static screenshot.

## Module layout

```
app/
  Home.py                          # Streamlit entry point (st.set_page_config + headline)
  pages/
    1_Three_Acts.py
    2_Peer_Comparison.py
    3_Feature_Contributions.py
    4_Limitations.py
    5_Pipeline_Status.py           # optional
  components/
    data_loader.py                 # cached CSV reads (st.cache_data)
    charts.py                      # shared plotly figure builders
    model.py                       # Ridge model load + standardized contributions
    narrative.py                   # static prose blocks reused across pages
  assets/
    logo.png                       # if any
    favicon.ico
  requirements.txt                 # pinned: streamlit, pandas, scikit-learn, plotly
.streamlit/
  config.toml                      # theme, page width, etc.
README.md (existing)               # add a "Live Dashboard" link section
```

## Tech stack

- **Streamlit** — multi-page app via the `pages/` convention.
- **Plotly Express** — interactive charts. Hover tooltips, zoom, click-to-filter. Beats matplotlib for a public dashboard.
- **scikit-learn Ridge** — re-trained at app startup (small dataset, fast). Cached via `st.cache_resource`.
- **Streamlit Community Cloud** — free, GitHub-integrated deployment. Auto-redeploys on push to `main`.

## Data flow

```
Phase 4 cron → updates clean CSVs → committed/pushed to GitHub
                                       ↓
                          Streamlit Cloud detects push → redeploys
                                       ↓
                          App reads CSVs from disk (cached)
```

The app **does not** call the NHL API. All API access lives in Phase 4. This keeps the app fast, predictable, and free of secrets/rate-limits.

## What's deliberately out of scope

- **A live "tonight's game" prediction.** The model can't support this honestly. Any "will McDavid score?" widget would be a fabrication of certainty the dataset does not provide.
- **User authentication / accounts.** Public, read-only.
- **Database backend.** CSVs are sufficient at this scale; a Postgres-or-SQLite migration is over-engineering.
- **Mobile-first design.** Streamlit handles small screens reasonably; we don't need a native app.

## Stretch (post-launch)

- **Add 2–3 more peers** (Matthews, Crosby, Draisaitl) via the existing `fetch_player_log.PLAYERS` registry. Strengthens the peer-comparison page directly.
- **GitHub Action that runs the pipeline daily** and auto-commits CSV updates. Pairs nicely with Streamlit Cloud's auto-redeploy.
- **A "what if" slider** on the feature-contribution page: drag `opp_ga_per_game` from 2.0 to 4.0 and watch the predicted points shift. Educational, not predictive.
- **Goalie features** (Limitation #5) once we have the data. Would unlock a separate page on H3 specifically.

## Estimated effort

- App scaffolding (Home + nav + theme): ~2 hrs
- Three Acts page (mostly chart porting from Phase 1): ~3 hrs
- Peer Comparison page: ~2 hrs
- Feature Contributions page (Ridge re-train + per-game decomposition): ~4 hrs
- Limitations page (port from `LIMITATIONS.md`): ~1 hr
- Polish, theme, write narrative blocks: ~3 hrs
- Deploy + smoke-test: ~1 hr

Roughly **2 working days**. Stretch milestones add a half-day to a day each.

## Order of work

1. Create `app/` skeleton with Home + one minimal page. Smoke-test locally (`streamlit run app/Home.py`).
2. Build `data_loader.py` and `charts.py` so pages share infrastructure.
3. Port the Phase 1 synthesis chart to the Home page — this is the headline; get it right first.
4. Build Peer Comparison page next (the strongest finding).
5. Three Acts page (most chart-heavy; reuses Phase 1 charts).
6. Feature Contributions page (touchiest — needs Ridge re-train + standardized contributions).
7. Limitations page (mostly markdown).
8. Polish: favicon, theme, page titles, narrative copy, mobile check.
9. Deploy to Streamlit Community Cloud. Verify auto-redeploy on push.
10. (Stretch) GitHub Action for daily pipeline run + commit.

## Phase 5 success criteria

- A recruiter reading the live URL for 60 seconds understands:
  1. McDavid won the Four Nations and set the Olympic record (counter to the popular narrative).
  2. His Stanley Cup Finals drop is *smaller* than a comparable peer's.
  3. The project knows what it can't claim (Florida confound, Hellebuyck n=3).
- A more curious reader can drill into per-game feature contributions.
- The dashboard reflects the latest game played within 24 hours of the pipeline run.
- The app does not present a "will-McDavid-score" prediction.

## Phase 6+ (out of scope here, but worth noting)

The natural follow-on after Phase 5 is **integrating advanced metrics** — Natural Stat Trick or MoneyPuck for on-ice GF/60, xG, scoring chances. That's the data extension that would let H3 actually be tested rigorously and would let H2 (team construction) be tested at all. The current dashboard would absorb those features naturally on the Feature Contributions page.
