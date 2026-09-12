"""
Peer Comparison page — the strongest finding in the project, made interactive.

Two views, because they answer different questions. The distribution shows
where McDavid's Finals decline sits among the whole peer group; the head-to-head
compares him to one peer across every round. Six players on one grouped bar
chart would be thirty bars and no answer.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from components import charts, data_loader
from components.data_loader import (
    NHL_CONTEXT_ORDER,
    PEER_KEYS,
    PLAYER_NAMES,
    context_label,
)

st.set_page_config(page_title="Peer Comparison · Variance97", page_icon="🏒", layout="wide")

st.title("Peer Comparison — McDavid against five peers")
st.markdown(
    "A decline only means something against a baseline. For most of this project "
    "the baseline was Nathan MacKinnon alone, and one peer is one data point. "
    "The peer group is now five elite centres of the same era, picked on role and "
    "usage before anyone looked at their numbers. Three reached a Stanley Cup "
    "Final in the window; two did not, which is part of the distribution rather "
    "than a reason to drop them."
)

mcdavid = data_loader.load_mcdavid()
peers = {key: data_loader.load_player(key) for key in PEER_KEYS}


def _mean(df: pd.DataFrame, context: str, metric: str = "points"):
    rows = df[df["game_context"] == context]
    return rows[metric].mean() if len(rows) else None


def _scf_drop(df: pd.DataFrame):
    rs = _mean(df, "regular_season")
    scf = _mean(df, "stanley_cup_finals")
    if scf is None or rs is None or pd.isna(scf):
        return None
    return scf - rs


# ---------------------------------------------------------------- distribution
drops = {"McDavid": _scf_drop(mcdavid)}
for key, df in peers.items():
    drops[PLAYER_NAMES[key]] = _scf_drop(df)

with_finals = {k: v for k, v in drops.items() if v is not None}
without_finals = [k for k, v in drops.items() if v is None]
ordered = sorted(with_finals.items(), key=lambda kv: kv[1])  # steepest first

st.subheader("Where McDavid's Finals decline sits")

fig = go.Figure()
for name, value in ordered:
    is_subject = name == "McDavid"
    color = charts.COLOR_MCDAVID if is_subject else "#7c8ca0"
    # The stick of the lollipop, drawn from zero to the marker.
    fig.add_shape(type="line", x0=0, x1=value, y0=name, y1=name,
                  line=dict(color="#d8dee7", width=2), layer="below")
    fig.add_scatter(
        x=[value], y=[name], mode="markers", name=name, showlegend=False,
        marker=dict(size=15, color=color, line=dict(width=2, color="#ffffff")),
        hovertemplate=f"<b>{name}</b><br>%{{x:+.2f}} pts/game vs regular season<extra></extra>",
    )
fig.add_vline(x=0, line=dict(color="#b9c6d6", width=1.5))
fig.update_layout(
    xaxis_title="Points per game vs regular season",
    yaxis_title="",
    margin=dict(t=20, b=50, l=90, r=30),
    height=90 + 46 * len(ordered),
)
st.plotly_chart(fig, width="stretch")

mcd_drop = drops["McDavid"]
steeper = [n for n, v in with_finals.items() if n != "McDavid" and v < mcd_drop]
shallower = [n for n, v in with_finals.items() if n != "McDavid" and v > mcd_drop]

c1, c2, c3 = st.columns(3)
c1.metric("McDavid, RS → Finals", f"{mcd_drop:+.2f} pts/game")
c2.metric(f"Fell further ({len(steeper)} of {len(with_finals) - 1})",
          ", ".join(steeper) or "none")
c3.metric(f"Held up better ({len(shallower)} of {len(with_finals) - 1})",
          ", ".join(shallower) or "none")

# Relative drop alongside the absolute one: holding a 1.09 rate is not the same
# feat as holding a 1.67 one, and the table should not hide that.
dist_rows = []
for name, value in ordered:
    df = mcdavid if name == "McDavid" else peers[
        next(k for k, v in PLAYER_NAMES.items() if v == name)
    ]
    rs = _mean(df, "regular_season")
    scf = _mean(df, "stanley_cup_finals")
    n_scf = int((df["game_context"] == "stanley_cup_finals").sum())
    dist_rows.append({
        "Player": name,
        "Regular season": round(rs, 2),
        "Finals": round(scf, 2),
        "Change": round(value, 2),
        "Relative": f"{100 * value / rs:+.0f}%",
        "n (Finals)": n_scf,
    })
st.dataframe(pd.DataFrame(dist_rows), width="stretch", hide_index=True)

st.markdown(
    "The single-peer version of this page said McDavid's decline was half "
    "MacKinnon's and left it there. The distribution says something more "
    "defensible and less flattering: **he is mid-pack.** Two peers fell "
    "further, one did not fall at all."
)

st.info(
    f"**{' and '.join(without_finals)}** reached no Stanley Cup Final between "
    "2021-22 and 2025-26, so they contribute to the earlier rounds below and "
    "nothing to the chart above. They are kept in the group deliberately: "
    "dropping a peer for having a short playoff record, after seeing that "
    "record, is how a comparison group gets curated into the answer you wanted."
)

st.divider()

# --------------------------------------------------------------- head-to-head
st.subheader("One peer at a time")

col_a, col_b, col_c = st.columns([2, 3, 2])
with col_a:
    peer_key = st.selectbox(
        "Compare against", PEER_KEYS, format_func=lambda k: PLAYER_NAMES[k],
    )
with col_b:
    contexts = st.multiselect(
        "Contexts to compare",
        NHL_CONTEXT_ORDER,
        default=NHL_CONTEXT_ORDER,
        format_func=context_label,
    )
with col_c:
    metric = st.selectbox(
        "Metric",
        ["points", "goals", "assists", "plus_minus"],
        format_func=lambda m: m.replace("_", " ").title(),
    )

if not contexts:
    st.warning("Select at least one context.")
    st.stop()

peer_df = peers[peer_key]
peer_name = PLAYER_NAMES[peer_key]

mcd_means = (mcdavid[mcdavid["game_context"].isin(contexts)]
             .groupby("game_context")[metric].mean()
             .reindex(contexts))
peer_means = (peer_df[peer_df["game_context"].isin(contexts)]
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
    x=labels, y=peer_means.values, name=peer_name,
    marker_color=charts.COLOR_MACKINNON,
    text=[f"{v:.2f}" if pd.notna(v) else "" for v in peer_means.values],
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
st.plotly_chart(fig, width="stretch")

st.caption(
    "A missing bar is a context that player never reached in the window."
)

# ---- sample sizes ----
st.subheader("Sample sizes")
n_mcd = (mcdavid[mcdavid["game_context"].isin(contexts)]
         .groupby("game_context").size().reindex(contexts).fillna(0).astype(int))
n_peer = (peer_df[peer_df["game_context"].isin(contexts)]
          .groupby("game_context").size().reindex(contexts).fillna(0).astype(int))
st.dataframe(
    pd.DataFrame({
        "Context": labels,
        "McDavid (n)": n_mcd.values,
        f"{peer_name} (n)": n_peer.values,
    }),
    width="stretch", hide_index=True,
)

st.divider()

st.markdown(
    "### What this comparison rules in and out\n"
    "- **It still rules out the strongest version of H1.** If McDavid's Finals "
    "output were unusually low for an elite forward, he would be at the bottom "
    "of this distribution. He is in the middle of it.\n"
    "- **It weakens the reverse claim too.** \"His decline is half his peer's\" "
    "was true of the peer we happened to pick. Against Eichel it runs the other "
    "way.\n"
    "- **Draisaitl is a within-team control, not an independent peer.** Same two "
    "Finals, same opponent, same supporting cast — and the steepest decline "
    "here. Whatever Florida did to Edmonton, it was done to both of them.\n"
    "- **Eichel faced those same Panthers and beat them**, scoring above his own "
    "regular-season rate in the 2023 Final. That doesn't dissolve the Florida "
    "confound in McDavid's data, but it does mean \"the Panthers suppress elite "
    "centres\" isn't a general law.\n"
    "- **Three Finals peers is still a small distribution.** Samples run from 6 "
    "to 13 games. A better baseline than one peer, not a tested effect."
)
