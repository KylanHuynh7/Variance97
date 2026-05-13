"""
Peer Comparison page — the strongest finding in the project, made interactive.
Toggle contexts and metrics; see McDavid vs MacKinnon side by side.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from components import charts, data_loader
from components.data_loader import NHL_CONTEXT_ORDER, context_label

st.set_page_config(page_title="Peer Comparison · Variance97", page_icon="🏒", layout="wide")

st.title("Peer Comparison — McDavid vs MacKinnon")
st.markdown(
    "MacKinnon is the cleanest peer benchmark available: same era, similar usage, "
    "made the playoffs every year of the McDavid window, and won the Cup in 2022. "
    "If McDavid uniquely collapsed in the Stanley Cup Finals, this is the comparison "
    "that would catch it."
)

mcdavid = data_loader.load_mcdavid()
mackinnon = data_loader.load_mackinnon()

# ---- controls ----
col_a, col_b = st.columns([3, 2])
with col_a:
    contexts = st.multiselect(
        "Contexts to compare",
        NHL_CONTEXT_ORDER,
        default=NHL_CONTEXT_ORDER,
        format_func=context_label,
    )
with col_b:
    metric = st.selectbox(
        "Metric",
        ["points", "goals", "assists", "plus_minus"],
        format_func=lambda m: m.replace("_", " ").title(),
    )

if not contexts:
    st.warning("Select at least one context.")
    st.stop()

# ---- chart ----
mcd_means = (mcdavid[mcdavid["game_context"].isin(contexts)]
             .groupby("game_context")[metric].mean()
             .reindex(contexts))
mac_means = (mackinnon[mackinnon["game_context"].isin(contexts)]
             .groupby("game_context")[metric].mean()
             .reindex(contexts))
labels = [context_label(c) for c in contexts]

fig = go.Figure()
fig.add_bar(
    x=labels, y=mcd_means.values, name="McDavid",
    marker_color=charts.COLOR_MCDAVID,
    text=[f"{v:.2f}" if pd.notna(v) else "" for v in mcd_means.values],
    textposition="outside",
)
fig.add_bar(
    x=labels, y=mac_means.values, name="MacKinnon",
    marker_color=charts.COLOR_MACKINNON,
    text=[f"{v:.2f}" if pd.notna(v) else "" for v in mac_means.values],
    textposition="outside",
)
fig.update_layout(
    barmode="group",
    yaxis_title=f"{metric.replace('_', ' ').title()} per game",
    xaxis_title="",
    legend=dict(orientation="h", yanchor="bottom", y=1.02, x=0),
    margin=dict(t=40, b=40, l=40, r=20),
    height=420,
)
st.plotly_chart(fig, width='stretch')

# ---- sample sizes ----
st.subheader("Sample sizes")
n_mcd = (mcdavid[mcdavid["game_context"].isin(contexts)]
         .groupby("game_context").size().reindex(contexts).fillna(0).astype(int))
n_mac = (mackinnon[mackinnon["game_context"].isin(contexts)]
         .groupby("game_context").size().reindex(contexts).fillna(0).astype(int))
n_table = pd.DataFrame({
    "Context": labels,
    "McDavid (n)": n_mcd.values,
    "MacKinnon (n)": n_mac.values,
})
st.dataframe(n_table, width='stretch', hide_index=True)

# ---- delta callout when both regular_season and stanley_cup_finals are selected ----
if "regular_season" in contexts and "stanley_cup_finals" in contexts and metric == "points":
    mcd_drop = mcd_means.loc["stanley_cup_finals"] - mcd_means.loc["regular_season"]
    mac_drop = mac_means.loc["stanley_cup_finals"] - mac_means.loc["regular_season"]

    st.subheader("Regular season → Stanley Cup Finals delta")
    c1, c2, c3 = st.columns(3)
    c1.metric("McDavid", f"{mcd_drop:+.2f} pts/game")
    c2.metric("MacKinnon", f"{mac_drop:+.2f} pts/game")
    c3.metric("Ratio (Mac / McD)", f"{abs(mac_drop / mcd_drop):.1f}×")

    st.success(
        "**The headline finding.** McDavid's individual Stanley Cup Finals "
        "decline is *smaller* than a directly comparable peer's — "
        "and the peer won the Cup. The popular *\"can't perform on the big stage\"* "
        "thesis doesn't survive contact with peer data."
    )

st.divider()

st.markdown(
    "### What this comparison rules in and out\n"
    "- **Rules out (the cleanest version of) H1.** If McDavid's individual "
    "Finals output were unusually low for an elite forward, MacKinnon's would "
    "be the floor. It isn't — MacKinnon dropped further.\n"
    "- **Doesn't address H3.** Whether *specific* matchups (Bobrovsky, Hellebuyck) "
    "suppress McDavid uniquely is a different question. See the Feature "
    "Contributions page for a model-based attempt at that.\n"
    "- **Sample-size caveat.** MacKinnon's Stanley Cup Finals n=6 (one series — "
    "the 2022 sweep over Tampa). The peer baseline is one tournament data point, "
    "not a stable estimate. Listed in Limitations."
)
