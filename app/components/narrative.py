"""
Reusable prose blocks. Pages assemble these via st.markdown(...).
Keeping the writing in one place makes it easier to maintain a consistent
voice and keep wording in sync with the notebooks.
"""

HEADLINE = """
**The popular narrative is simple: Connor McDavid can't win the big one. The data tells a more specific story.**

McDavid won the 2025 Four Nations Face-Off (scoring the OT winner himself), set the Olympic scoring record at the 2026 Milan Cortina Games (13 points in 6 games), and his individual Stanley Cup Finals production drops about 0.28 points per game vs his regular season.

That last number means nothing on its own — every elite forward scores less in a Final. Measured against five peers of the same era, **McDavid is mid-pack: of the three who reached a Final in this window, two fell further than he did and one didn't fall at all.**

So the working thesis isn't *"McDavid underperforms in championship games"*. It's narrower: his teams keep losing deep playoff runs even when his individual production isn't unusually low for an elite forward.
"""

PEER_FOOTER = """
McDavid's Finals decline sits in the middle of his peer group, not at the bottom of it. MacKinnon (who won the Cup) and Draisaitl (his own linemate, in the same two series) both fell further; Jack Eichel didn't fall at all. The popular "can't perform on the big stage" framing doesn't survive contact with peer data — and neither does the tidier claim, made by an earlier version of this project, that his decline is uniquely small. See the Peer Comparison page for the distribution.
"""

CONFOUND_CALLOUT = """
**Two confounds bound everything below.** They aren't bugs to fix — they're facts about the data:

1. **Florida ↔ Stanley Cup Finals are perfectly entangled.** Edmonton's only two SCF appearances in the dataset are both vs the Panthers. Statistically we cannot separate "Stanley Cup Finals effect" from "vs Florida effect."
2. **Hellebuyck sample is n=3.** All three games are in one tournament window (Four Nations + Olympics).

The Limitations page has the full list.
"""

FEATURE_PAGE_DISCLAIMER = """
This model performs at baseline (R² near zero on held-out games). It is **not a deployable predictor.** Use this page to understand which features carry signed weight in the regression — *not* to predict tonight's game.

The interesting result is **what dropped, not what kept rank.** When the original notebook's logistic regression had only `game_context` to work with, "Stanley Cup Finals" dominated with coefficient +0.67. Once real gameplay features compete (`opp_ga_per_game`, `game_number`, `rolling_pts_5`), the SCF coefficient collapses to **+0.037** — measured against an average regular-season game, which is the pinned baseline category. The variance reroutes to late-series fatigue and opponent defensive quality.
"""


LATEST_EXIT = """
**One series runs against all of the above, and it is the most recent one.** Edmonton lost the 2025-26 first round to Anaheim 2–4, and McDavid scored 1.00 pts/game against a 1.67 regular-season rate, at −8. That drop (0.67) is larger than his Stanley Cup Finals drop and larger than MacKinnon's. Of the 14 playoff series in the window it is his lowest-scoring and his worst by plus/minus.

Six games against one opponent settles nothing on its own — Limitation #1 applies to a counterexample exactly as it applies to the finding. It is stated here rather than left to disappear into a pooled first-round average.
"""
