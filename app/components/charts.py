"""
Reusable Plotly figure builders. All chart styling lives here so pages
stay focused on layout and narrative.
"""
from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go

# Palette — keep it sober and consistent across pages.
COLOR_MCDAVID = "#FC4C02"   # Oilers orange (and project accent)
COLOR_MACKINNON = "#6F263D"  # Avalanche burgundy
COLOR_BASELINE = "#7F7F7F"
COLOR_WIN = "#2EA84F"
COLOR_LOSS = "#C8102E"


def peer_by_context(
    mcdavid: pd.DataFrame,
    mackinnon: pd.DataFrame,
    contexts: list[str],
) -> go.Figure:
    """Grouped bar: McDavid vs MacKinnon points/game across NHL contexts."""
    mcd = (mcdavid[mcdavid["game_context"].isin(contexts)]
           .groupby("game_context")["points"].mean()
           .reindex(contexts))
    mac = (mackinnon[mackinnon["game_context"].isin(contexts)]
           .groupby("game_context")["points"].mean()
           .reindex(contexts))

    labels = [c.replace("_", " ").title() for c in contexts]
    fig = go.Figure()
    fig.add_bar(x=labels, y=mcd.values, name="McDavid",
                marker_color=COLOR_MCDAVID,
                text=[f"{v:.2f}" if pd.notna(v) else "" for v in mcd.values],
                textposition="outside")
    fig.add_bar(x=labels, y=mac.values, name="MacKinnon",
                marker_color=COLOR_MACKINNON,
                text=[f"{v:.2f}" if pd.notna(v) else "" for v in mac.values],
                textposition="outside")
    fig.update_layout(
        barmode="group",
        yaxis_title="Points per game",
        xaxis_title="",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, x=0),
        margin=dict(t=40, b=40, l=40, r=20),
        height=380,
    )
    return fig


def points_by_game(
    df: pd.DataFrame,
    title: str = "",
    show_ot_marker: bool = False,
) -> go.Figure:
    """Per-game points bar chart, colored by W/L."""
    df = df.sort_values("date").reset_index(drop=True)
    colors = [COLOR_WIN if r == "W" else COLOR_LOSS for r in df["result"]]
    labels = [
        f"{d.strftime('%b %d')}<br>{opp}"
        for d, opp in zip(df["date"], df["opponent"])
    ]
    fig = go.Figure()
    fig.add_bar(
        x=labels, y=df["points"],
        marker_color=colors,
        text=df["points"], textposition="outside",
        hovertemplate="%{x}<br>Points: %{y}<extra></extra>",
    )
    fig.update_layout(
        title=title,
        yaxis_title="Points",
        xaxis_title="",
        margin=dict(t=50, b=60, l=40, r=20),
        height=380,
        showlegend=False,
    )
    return fig


def points_by_game_number(df: pd.DataFrame) -> go.Figure:
    """Average points by playoff game number (1..7), with regular season baseline."""
    nhl = df[df["game_context"].isin(
        ["first_round", "second_round", "conf_finals", "stanley_cup_finals"]
    )]
    avg = nhl.groupby("game_number")["points"].mean()
    rs_avg = df[df["game_context"] == "regular_season"]["points"].mean()

    fig = go.Figure()
    fig.add_scatter(
        x=avg.index, y=avg.values,
        mode="lines+markers", line=dict(color=COLOR_MCDAVID, width=3),
        marker=dict(size=10), name="Avg points",
        hovertemplate="Game %{x}<br>Avg: %{y:.2f}<extra></extra>",
    )
    fig.add_hline(
        y=rs_avg, line_dash="dash", line_color=COLOR_BASELINE,
        annotation_text=f"Regular season avg ({rs_avg:.2f})",
        annotation_position="top right",
    )
    fig.add_vrect(
        x0=5.5, x1=7.5, fillcolor="red", opacity=0.05, line_width=0,
        annotation_text="Late series", annotation_position="top left",
    )
    fig.update_layout(
        xaxis=dict(tickmode="linear", tick0=1, dtick=1, title="Playoff game number"),
        yaxis_title="McDavid points (avg)",
        margin=dict(t=20, b=40, l=40, r=20),
        height=350,
    )
    return fig


def coefficient_bar(coef_df: pd.DataFrame) -> go.Figure:
    """Horizontal bar chart of standardized Ridge coefficients."""
    coef_df = coef_df.sort_values("coefficient")
    colors = [COLOR_MCDAVID if v >= 0 else "#1F77B4" for v in coef_df["coefficient"]]
    fig = go.Figure()
    fig.add_bar(
        x=coef_df["coefficient"], y=coef_df["feature"],
        orientation="h", marker_color=colors,
        text=[f"{v:+.3f}" for v in coef_df["coefficient"]],
        textposition="outside",
        hovertemplate="%{y}<br>Coefficient: %{x:.3f}<extra></extra>",
    )
    fig.add_vline(x=0, line_color="black", line_width=1)
    fig.update_layout(
        xaxis_title="Coefficient (standardized features)",
        yaxis_title="",
        margin=dict(t=20, b=40, l=20, r=40),
        height=420,
    )
    return fig


def contribution_waterfall(contributions: pd.Series, intercept: float, actual: float) -> go.Figure:
    """Waterfall-ish chart of per-game feature contributions for one game."""
    contributions = contributions.sort_values(key=abs, ascending=False)
    colors = [COLOR_MCDAVID if v >= 0 else "#1F77B4" for v in contributions.values]

    fig = go.Figure()
    fig.add_bar(
        x=contributions.values, y=contributions.index,
        orientation="h", marker_color=colors,
        text=[f"{v:+.2f}" for v in contributions.values],
        textposition="outside",
        hovertemplate="%{y}<br>Contribution: %{x:+.2f} pts<extra></extra>",
    )
    fig.add_vline(x=0, line_color="black", line_width=1)
    fig.update_layout(
        title=f"Per-game feature contributions  (intercept = {intercept:.2f}, actual = {actual:.0f})",
        xaxis_title="Contribution to predicted points",
        yaxis_title="",
        margin=dict(t=50, b=40, l=20, r=40),
        height=420,
    )
    return fig
