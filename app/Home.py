"""
Variance97 — Home page.

The 30-second pitch. Anyone landing here should leave knowing:
  1) McDavid won the Four Nations and set the Olympic record (counter-narrative).
  2) His Stanley Cup Finals drop is *smaller* than MacKinnon's (the headline).
  3) Where to drill in next.
"""
import sys
from pathlib import Path

# Make the components package importable regardless of how Streamlit launches.
sys.path.insert(0, str(Path(__file__).resolve().parent))

import streamlit as st

from components import charts, data_loader, narrative
from components.data_loader import NHL_CONTEXT_ORDER

st.set_page_config(
    page_title="Variance97 — McDavid in High-Stakes Hockey",
    page_icon="🏒",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---- header ----
st.title("Variance97")
st.caption(
    "A data-science investigation of Connor McDavid's performance in "
    "high-stakes hockey: the NHL Stanley Cup Playoffs, the 2025 Four Nations "
    "Face-Off, and the 2026 Winter Olympics."
)

st.markdown(narrative.HEADLINE)

# ---- headline chart ----
st.subheader("McDavid vs MacKinnon — points per game by NHL context")
mcdavid = data_loader.load_mcdavid()
mackinnon = data_loader.load_mackinnon()
fig = charts.peer_by_context(mcdavid, mackinnon, NHL_CONTEXT_ORDER)
st.plotly_chart(fig, width='stretch')

# Delta callout
mcd_drop = (
    mcdavid[mcdavid["game_context"] == "stanley_cup_finals"]["points"].mean()
    - mcdavid[mcdavid["game_context"] == "regular_season"]["points"].mean()
)
mac_drop = (
    mackinnon[mackinnon["game_context"] == "stanley_cup_finals"]["points"].mean()
    - mackinnon[mackinnon["game_context"] == "regular_season"]["points"].mean()
)

col1, col2, col3 = st.columns(3)
col1.metric(
    "McDavid: regular season → SCF",
    f"{mcd_drop:+.2f} pts/game",
    help="Drop in points/game between regular season and Stanley Cup Finals.",
)
col2.metric(
    "MacKinnon: regular season → SCF",
    f"{mac_drop:+.2f} pts/game",
    help="MacKinnon's drop, for comparison. He won the 2022 Cup.",
)
col3.metric(
    "Ratio",
    f"{abs(mac_drop / mcd_drop):.1f}×",
    help="MacKinnon's drop is this many times larger than McDavid's.",
)

st.markdown(narrative.PEER_FOOTER)

st.divider()

# ---- where to go next ----
st.subheader("Drill in")
left, mid, right = st.columns(3)
with left:
    st.markdown(
        "**Three Acts**  \n"
        "Stanley Cup Playoffs, Four Nations, Olympics — game-by-game with the "
        "regular-season baseline overlaid."
    )
with mid:
    st.markdown(
        "**Peer Comparison**  \n"
        "Pick your own contexts and metrics. The headline finding lives here, "
        "with an explicit sample-size caveat."
    )
with right:
    st.markdown(
        "**Feature Contributions**  \n"
        "Per-game decomposition of the Phase 3 Ridge model. Shows what carries "
        "signed weight in McDavid's points — *not* a tonight's-game predictor."
    )

st.info(narrative.CONFOUND_CALLOUT)

# ---- footer ----
with st.sidebar:
    st.markdown("### About")
    st.markdown(
        "Built from a notebook-driven investigation across four phases. "
        "Source code, methodology, and full limitations document on "
        "[GitHub](https://github.com/KylanHuynh7/Variance97)."
    )
    st.markdown("### Latest data")
    try:
        m = data_loader.csv_mtime("mcdavid_game_log_clean.csv")
        st.caption(f"Refreshed {m:%Y-%m-%d %H:%M %Z}")
    except Exception:
        pass
    st.caption(
        f"{len(mcdavid)} McDavid games · {len(mackinnon)} MacKinnon games"
    )
