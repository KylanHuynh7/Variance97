"""
Feature Contributions page — replaces the original "predict pointless"
plan with a feature-attribution view. Shows what carries signed weight
in the Phase 3 Ridge model, and lets the user pick a game to see its
per-feature contribution to the prediction.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import streamlit as st

from components import charts, data_loader, model, narrative

st.set_page_config(page_title="Feature Contributions · Variance97", page_icon="🏒", layout="wide")

st.title("Feature Contributions")
st.markdown(narrative.FEATURE_PAGE_DISCLAIMER)

# ---- model ----
mtime = (data_loader.DATA_DIR / "mcdavid_game_log_clean.csv").stat().st_mtime
bundle = model.train_model(mtime)

st.subheader("Standardized coefficients (whole-model view)")
st.caption(
    f"Trained on {bundle['n_train']} NHL games. Standardized features → "
    "coefficients are directly comparable in magnitude. Positive = increases "
    "predicted points, negative = decreases."
)
st.plotly_chart(charts.coefficient_bar(bundle["coef_df"]), width='stretch')

st.markdown(
    "**The pattern:** `game_number` is the strongest negative driver — McDavid's "
    "production cliff in late-series games is the model's clearest signal. "
    "`opp_ga_per_game` carries the modest positive effect that represents H3 "
    "(opponent defensive quality matters). And **`game_context_stanley_cup_finals` "
    "is small** once it has to compete against gameplay variables — the feature "
    "the original notebook treated as dominant has dissolved."
)

st.divider()

# ---- per-game decomposition ----
st.subheader("Per-game decomposition")
st.markdown(
    "Pick a game to see which features pulled the model's prediction up and "
    "which pulled it down. The contributions sum (with the intercept) to the "
    "predicted points."
)

df_used = bundle["df"]
labels = [
    f"{r['date'].strftime('%Y-%m-%d')}  vs {r['opponent']}  · "
    f"{data_loader.context_label(r['game_context'])}  · "
    f"actual {int(r['points'])} pts"
    for _, r in df_used.iterrows()
]
default_idx = len(df_used) - 1  # most recent game
chosen = st.selectbox(
    "Game",
    options=range(len(df_used)),
    index=default_idx,
    format_func=lambda i: labels[i],
)

decomp = model.per_game_contributions(bundle, int(chosen))
fig = charts.contribution_waterfall(
    decomp["contributions"], decomp["intercept"], decomp["actual"],
)
st.plotly_chart(fig, width='stretch')

c1, c2, c3 = st.columns(3)
c1.metric("Intercept (training mean)", f"{decomp['intercept']:.2f}")
c2.metric("Predicted", f"{decomp['predicted']:.2f}")
c3.metric("Actual", f"{int(decomp['actual'])}")

st.caption(
    "Why predicted ≠ actual most of the time: hockey games are noisy. The model "
    "earns its keep in the *aggregate signed direction* of features, not in "
    "sharply forecasting any individual game."
)
