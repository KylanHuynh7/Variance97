"""
Reusable prose blocks. Pages assemble these via st.markdown(...).
Keeping the writing in one place makes it easier to maintain a consistent
voice and keep wording in sync with the notebooks.
"""

HEADLINE = """
**The popular narrative is simple: Connor McDavid can't win the big one. The data tells a more specific story.**

McDavid won the 2025 Four Nations Face-Off (scoring the OT winner himself), set the Olympic scoring record at the 2026 Milan Cortina Games (13 points in 6 games), and his individual Stanley Cup Finals production drops about 0.28 points per game vs his regular season — but **Nathan MacKinnon's drop is twice as large (0.54), and he won the Cup in 2022.**

So the working thesis isn't *"McDavid underperforms in championship games"*. It's narrower: his teams keep losing deep playoff runs even when his individual production isn't unusually low for an elite forward.
"""

PEER_FOOTER = """
MacKinnon's regular-season-to-Stanley-Cup-Finals drop is roughly twice McDavid's, and he won the Cup. McDavid's individual Finals decline is *smaller* than a directly comparable peer's — it isn't outlier-bad. The popular "can't perform on the big stage" framing doesn't survive contact with peer data.
"""

CONFOUND_CALLOUT = """
**Two confounds bound everything below.** They aren't bugs to fix — they're facts about the data:

1. **Florida ↔ Stanley Cup Finals are perfectly entangled.** Edmonton's only two SCF appearances in the dataset are both vs the Panthers. Statistically we cannot separate "Stanley Cup Finals effect" from "vs Florida effect."
2. **Hellebuyck sample is n=3.** All three games are in one tournament window (Four Nations + Olympics).

The Limitations page has the full list.
"""

FEATURE_PAGE_DISCLAIMER = """
This model performs at baseline (R² near zero on held-out games). It is **not a deployable predictor.** Use this page to understand which features carry signed weight in the regression — *not* to predict tonight's game.

The interesting result is **what dropped, not what kept rank.** When the original notebook's logistic regression had only `game_context` to work with, "Stanley Cup Finals" dominated with coefficient +0.67. Once real gameplay features compete (`opp_ga_per_game`, `game_number`, `rolling_pts_5`), the SCF coefficient collapses to roughly −0.07. The variance reroutes to late-series fatigue and opponent defensive quality.
"""
