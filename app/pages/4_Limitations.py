"""
Limitations page — explicit confound disclosure. This page exists so
no visitor can accidentally over-read the conclusions.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import streamlit as st

st.set_page_config(page_title="Limitations · Variance97", page_icon="🏒", layout="wide")

st.title("Limitations")
st.markdown(
    "These are the structural boundaries of the project. They are not bugs — "
    "they are facts about the data and the methodology that any honest "
    "analysis has to flag."
)

# ---- the two priority callouts ----
st.subheader("Two confounds you cannot resolve with this dataset")

col1, col2 = st.columns(2)

with col1:
    st.error(
        "**Florida ↔ Stanley Cup Finals is a perfect confound.**\n\n"
        "Edmonton's only two Stanley Cup Finals appearances in the dataset are "
        "both against the Florida Panthers (2024 and 2025). Every \"Stanley Cup "
        "Finals\" row in the McDavid dataset is also a \"vs Florida\" row. "
        "Statistically, the two effects cannot be separated.\n\n"
        "Any claim that *\"McDavid struggles in the Finals\"* is observationally "
        "identical to *\"McDavid struggles vs the 2023–25 Panthers.\"*"
    )

with col2:
    st.error(
        "**The Hellebuyck sample is n=3.**\n\n"
        "All three McDavid-vs-Hellebuyck games happen in a single tournament "
        "window (2025 Four Nations + 2026 Olympics). With only three games, "
        "the *direction* of the effect is unambiguous (McDavid scored less) "
        "but the *magnitude* is unstable — one different result and the "
        "estimate shifts dramatically.\n\n"
        "Phase 2 reports this as a pattern observation, not a tested effect."
    )

st.divider()

# ---- the rest, summarized ----
st.subheader("The full list")

with st.expander("**1. Sample size in high-stakes contexts**", expanded=False):
    st.markdown(
        "Stanley Cup Finals (n=13), elimination losses (n=4), games vs Hellebuyck "
        "(n=3), Olympic gold medal game (n=1). No Phase 2 test reaches significance "
        "at α=0.05 or Bonferroni-corrected α=0.0125. Cohen's d is reported for every "
        "test as the more honest quantification."
    )

with st.expander("**2. Single peer in the comparison**"):
    st.markdown(
        "MacKinnon is a defensible choice (same era, similar usage, won the Cup in "
        "2022) but a single peer is a single data point. Adding Matthews / Crosby / "
        "Draisaitl would let us report McDavid's drop relative to the *distribution* "
        "of peer drops, not a single comparison."
    )

with st.expander("**3. Points only, no on-ice or shift-level metrics**"):
    st.markdown(
        "Production is measured in goals, assists, points, plus/minus. No Corsi, "
        "Fenwick, expected goals, scoring chances, or zone starts. The metric where "
        "the H3 gap most likely lives — even-strength on-ice goal differential vs "
        "elite goalies — is precisely the metric the dataset can't quantify. "
        "Natural Stat Trick / MoneyPuck integration is a known follow-on."
    )

with st.expander("**4. No goalie-specific features**"):
    st.markdown(
        "`opp_ga_per_game` captures team defensive quality (system + goalie combined) "
        "but cannot isolate the goalie. Without per-game starting-goalie data plus "
        "save% / high-danger save%, we can't say \"Hellebuyck specifically\" — only "
        "\"vs USA in this tournament window.\""
    )

with st.expander("**5. Phase 3 is scoped to NHL games only**"):
    st.markdown(
        "International contexts have no `opp_ga_per_game` (different leagues, no NHL "
        "standings) and the original chronological train/test split forced zero "
        "coefficients on contexts the model never trained on. Phase 3 is honest about "
        "what it can speak to (NHL games); Phases 1 and 2 retain full international "
        "coverage."
    )

with st.expander("**6. Team construction (H2) is not directly tested**"):
    st.markdown(
        "Linemate ice time, on-ice GF/60, secondary scoring distribution, defensive "
        "pair quality — none of these are in the dataset. Phase 1 observes that "
        "Edmonton's team goals decline alongside McDavid's metrics in the Finals "
        "(consistent with H2), but no formal test of H2 exists in any phase."
    )

with st.expander("**7. Team stats are season snapshots, not game-date specific**"):
    st.markdown(
        "`opp_ga_per_game` uses end-of-season standings. A team's GA/game on March 1 "
        "may differ from its end-of-season figure (trade-deadline moves, goalie "
        "injuries). For a model already operating at low predictive resolution, "
        "this is unlikely to materially shift conclusions, but it is a known "
        "approximation."
    )

with st.expander("**8. `rest_days` is computed from McDavid game gaps**"):
    st.markdown(
        "Not from Edmonton's actual schedule. If McDavid sat out a team game (rest, "
        "injury), the feature treats the next game as if no rest occurred. McDavid "
        "rarely sits and the coefficient is near zero anyway, but the feature is "
        "technically a misstatement when he misses a team game."
    )

st.divider()

st.markdown(
    "The full version of this list, with what would resolve each limitation, "
    "lives at [`LIMITATIONS.md`](https://github.com/KylanHuynh7/Variance97/blob/main/LIMITATIONS.md) "
    "in the repo. The corresponding strength of the project: every item here is "
    "documented, quantified where possible, and tied to a specific phase's "
    "claims. The project does not silently overreach."
)
