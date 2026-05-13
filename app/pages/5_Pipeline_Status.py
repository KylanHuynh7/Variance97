"""
Pipeline Status page — proof-of-life that the dashboard is reading fresh data.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
import streamlit as st

from components import data_loader

st.set_page_config(page_title="Pipeline Status · Variance97", page_icon="🏒", layout="wide")

st.title("Pipeline Status")
st.markdown(
    "Operational view of the Phase 4 data pipeline. The dashboard reads "
    "from local CSVs that are kept fresh by `data/build/update_all.py` — no "
    "live API calls happen from this app."
)

# ---- file freshness ----
files = {
    "McDavid clean (analysis input)": "mcdavid_game_log_clean.csv",
    "MacKinnon clean (analysis input)": "mackinnon_game_log_clean.csv",
    "McDavid NHL source (API-derived)": "mcdavid_nhl_log.csv",
    "MacKinnon NHL source (API-derived)": "mackinnon_nhl_log.csv",
    "International games (manual entry)": "international_games.csv",
    "Opponent team stats (NHL standings)": "opponent_team_stats.csv",
}

rows = []
for label, name in files.items():
    path = data_loader.DATA_DIR / name
    if path.exists():
        rows.append({
            "File": label,
            "Path": f"data/{name}",
            "Last refreshed": data_loader.csv_mtime(name).strftime("%Y-%m-%d %H:%M %Z"),
            "Size (KB)": round(path.stat().st_size / 1024, 1),
        })
    else:
        rows.append({
            "File": label, "Path": f"data/{name}",
            "Last refreshed": "(missing)", "Size (KB)": 0,
        })
st.dataframe(pd.DataFrame(rows), width='stretch', hide_index=True)

# ---- McDavid coverage summary ----
mcdavid = data_loader.load_mcdavid()
st.subheader("McDavid coverage")
c1, c2, c3 = st.columns(3)
c1.metric("Total games", len(mcdavid))
c2.metric("Latest game", mcdavid["date"].max().strftime("%Y-%m-%d"))
c3.metric("Seasons", mcdavid["season"].nunique())

st.markdown("##### Games per season / context")
st.dataframe(
    mcdavid.groupby(["season", "game_context"]).size().reset_index(name="games"),
    width='stretch', hide_index=True,
)

# ---- how to refresh ----
st.subheader("Refresh manually")
st.code("bash scripts/run_update.sh", language="bash")
st.caption(
    "The pipeline is idempotent — running with no new games reports `+0` and "
    "exits cleanly. See `PHASE4_PLAN.md` for the architecture."
)
