"""
Three Acts page — interactive port of Phase 1's narrative structure.
Stanley Cup Playoffs / Four Nations / Olympics, each as its own tab.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
import streamlit as st

from components import charts, data_loader

st.set_page_config(page_title="Three Acts · Variance97", page_icon="🏒", layout="wide")

st.title("Three Acts")
st.caption(
    "How McDavid's production moves across three high-stakes contexts: the "
    "NHL Stanley Cup Playoffs, the 2025 Four Nations Face-Off, and the "
    "2026 Winter Olympics."
)

mcdavid = data_loader.load_mcdavid()

tab_nhl, tab_fnf, tab_oly = st.tabs([
    "Act 1 — Stanley Cup Playoffs",
    "Act 2 — Four Nations Face-Off",
    "Act 3 — 2026 Winter Olympics",
])


# ============================== Act 1 ==============================
with tab_nhl:
    st.subheader("McDavid in the NHL Playoffs")

    nhl_contexts = ["regular_season", "first_round", "second_round",
                    "conf_finals", "stanley_cup_finals"]
    by_ctx = (mcdavid[mcdavid["game_context"].isin(nhl_contexts)]
              .groupby("game_context")
              .agg(points=("points", "mean"),
                   plus_minus=("plus_minus", "mean"),
                   n=("points", "size"))
              .reindex(nhl_contexts).round(2))
    rs_pts = by_ctx.loc["regular_season", "points"]

    # Headline numbers
    cols = st.columns(len(by_ctx))
    for col, (ctx, row) in zip(cols, by_ctx.iterrows()):
        delta = row["points"] - rs_pts if ctx != "regular_season" else None
        col.metric(
            data_loader.context_label(ctx),
            f"{row['points']:.2f} pts",
            f"{delta:+.2f} vs RS" if delta is not None else f"n={int(row['n'])}",
            delta_color="off",
        )

    st.markdown("##### Late-series production cliff")
    st.markdown(
        "Phase 1's most-replicated NHL finding: McDavid's points hold up through "
        "Game 5 and then fall sharply. Slide the threshold to filter the chart."
    )
    fig_gn = charts.points_by_game_number(mcdavid)
    st.plotly_chart(fig_gn, width='stretch')

    # Elimination-game splits
    st.markdown("##### Elimination games — wins vs losses")
    nhl_only = mcdavid[mcdavid["game_context"].isin(nhl_contexts)]
    elim = nhl_only[nhl_only["is_elimination_game"]]
    elim_w = elim[elim["result"] == "W"]
    elim_l = elim[elim["result"] == "L"]
    cols = st.columns(3)
    cols[0].metric("Regular season avg", f"{rs_pts:.2f} pts/game")
    cols[1].metric(
        f"Elimination wins (n={len(elim_w)})",
        f"{elim_w['points'].mean():.2f} pts/game" if len(elim_w) else "—",
    )
    cols[2].metric(
        f"Elimination losses (n={len(elim_l)})",
        f"{elim_l['points'].mean():.2f} pts/game" if len(elim_l) else "—",
    )
    st.caption(
        "McDavid's average points are actually *higher* in elimination games "
        "than non-elimination games — driven by the wins. The split is what "
        "Phase 2 Test 2 picked up: large effect size on losses, small sample."
    )


# ============================== Act 2 ==============================
with tab_fnf:
    st.subheader("McDavid at the 2025 Four Nations Face-Off")
    st.markdown(
        "Canada won the tournament. McDavid scored the OT winner in the gold "
        "medal game vs the United States. The only loss was the group-stage "
        "game against the US (with Hellebuyck in net)."
    )

    fnf = mcdavid[mcdavid["game_context"].str.contains("four_nations", case=False, na=False)].copy()
    fnf = fnf.sort_values("date")

    fig = charts.points_by_game(fnf, title="Four Nations — McDavid game-by-game")
    st.plotly_chart(fig, width='stretch')

    st.dataframe(
        fnf[["date", "opponent", "game_context", "points", "plus_minus", "result", "team_score", "opp_score"]]
            .assign(date=lambda d: d["date"].dt.strftime("%Y-%m-%d")),
        width='stretch', hide_index=True,
    )

    rs_pts = mcdavid[mcdavid["game_context"] == "regular_season"]["points"].mean()
    fnf_pts = fnf["points"].mean()
    cols = st.columns(2)
    cols[0].metric("FNF avg", f"{fnf_pts:.2f} pts/game", f"{fnf_pts - rs_pts:+.2f} vs RS",
                   delta_color="off")
    cols[1].metric("Tournament outcome", "🥇 Gold")


# ============================== Act 3 ==============================
with tab_oly:
    st.subheader("McDavid at the 2026 Milan Cortina Olympics")
    st.markdown(
        "McDavid set the **Olympic scoring record** with 13 points in 6 games. "
        "Then came the gold medal game against the United States — Connor "
        "Hellebuyck in net, Canada lost 1–2 in OT, McDavid was held pointless."
    )

    oly = mcdavid[mcdavid["game_context"].str.contains("olympic", case=False, na=False)].copy()
    oly = oly.sort_values("date")
    competitive = oly[~oly["game_context"].str.contains("exhibition", case=False, na=False)]

    fig = charts.points_by_game(
        competitive,
        title="Olympics — competitive games (group + knockouts)",
    )
    st.plotly_chart(fig, width='stretch')

    st.dataframe(
        oly[["date", "opponent", "game_context", "points", "plus_minus", "result", "team_score", "opp_score"]]
            .assign(date=lambda d: d["date"].dt.strftime("%Y-%m-%d")),
        width='stretch', hide_index=True,
    )

    cols = st.columns(3)
    cols[0].metric("Olympic points (total)", f"{int(oly['points'].sum())}")
    cols[1].metric("Gold medal game", "0 pts, −2", "vs Hellebuyck", delta_color="off")
    cols[2].metric("Tournament outcome", "🥈 Silver")

    st.warning(
        "The pattern across both international tournaments is the same: "
        "McDavid's only pointless games come against the United States with "
        "Hellebuyck in net. n=3 — see Limitations."
    )
