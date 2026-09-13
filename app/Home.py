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


def _scf_drop(df):
    """Regular season to Stanley Cup Finals, or None without a Finals sample."""
    scf = df[df["game_context"] == "stanley_cup_finals"]["points"]
    rs = df[df["game_context"] == "regular_season"]["points"]
    return scf.mean() - rs.mean() if len(scf) and len(rs) else None


mcd_drop = _scf_drop(mcdavid)
peer_drops = {
    data_loader.PLAYER_NAMES[key]: _scf_drop(data_loader.load_player(key))
    for key in data_loader.PEER_KEYS
}
with_finals = {k: v for k, v in peer_drops.items() if v is not None}
steeper = [k for k, v in with_finals.items() if v < mcd_drop]
shallower = [k for k, v in with_finals.items() if v > mcd_drop]

col1, col2, col3 = st.columns(3)
col1.metric(
    "McDavid: regular season → SCF",
    f"{mcd_drop:+.2f} pts/game",
    help="Drop in points/game between regular season and Stanley Cup Finals.",
)
col2.metric(
    f"Peers who fell further ({len(steeper)} of {len(with_finals)})",
    ", ".join(steeper) or "none",
    help="Peers whose regular-season-to-Finals decline is steeper than McDavid's.",
)
col3.metric(
    f"Peers who held up better ({len(shallower)} of {len(with_finals)})",
    ", ".join(shallower) or "none",
    help="Peers whose decline is shallower than McDavid's.",
)

st.markdown(narrative.PEER_FOOTER)

st.warning(narrative.LATEST_EXIT)

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
