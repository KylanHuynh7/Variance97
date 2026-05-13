# Limitations

This document records the structural limitations of Variance97's current implementation. They are not bugs — they are the honest boundaries of what the dataset and methodology can support. Each limitation is stated, its impact on the analysis is described, and what would resolve it is noted.

The project takes the position that surfacing these limitations is more analytically useful than hiding them.

---

## 1. Sample size in high-stakes contexts

**The limitation.** The contexts at the heart of the project — Stanley Cup Finals (n=13), elimination losses (n=4), games vs Hellebuyck (n=3), Olympic gold medal game (n=1) — have sample sizes that are structurally too small for conventional statistical inference.

**Impact.** No test in Phase 2 reaches significance at either α=0.05 or the Bonferroni-corrected α=0.0125. The project compensates by reporting Cohen's d (effect size) alongside every p-value, but effect-size estimates from n=3 are themselves unstable.

**What would resolve it.** Time. As McDavid plays more deep playoff runs and international tournaments, the sample grows. Until then, Phase 2's findings are best read as effect-size patterns, not tested effects.

---

## 2. The Florida / Stanley Cup Finals confound

**The limitation.** Edmonton's only two Stanley Cup Finals appearances in the dataset are both against the Florida Panthers (2024 and 2025). Every "Stanley Cup Finals" row is also a "vs Florida" row. Statistically, the two effects cannot be separated.

**Impact.** Any claim that "McDavid struggles in the Finals" is observationally identical to "McDavid struggles vs the 2023–25 Panthers." Phase 3's ML model partially addresses this by introducing `opp_ga_per_game` as a generic opponent-strength feature, but the underlying confound in the raw data cannot be eliminated.

**What would resolve it.** Edmonton reaching the Finals against a non-Florida opponent, or expanding the dataset to include other elite forwards' Finals appearances against multiple opponents.

---

## 3. Single peer in the comparison

**The limitation.** Phase 1 and Phase 2 use Nathan MacKinnon as the sole peer baseline. He is a defensible choice (same era, similar usage, won the Cup in 2022), but a single peer is a single data point.

**Impact.** The headline finding — that McDavid's regular-season-to-Stanley-Cup-Finals drop is half MacKinnon's — depends on MacKinnon's 6-game 2022 Finals being representative of "elite forward in Finals." It may not be.

**What would resolve it.** Pulling additional peers (Auston Matthews, Sidney Crosby, Leon Draisaitl, Jack Eichel) and reporting the McDavid drop relative to the *distribution* of peer drops, not a single comparison. Same NHL API pipeline as the existing MacKinnon pull.

---

## 4. Points only, no on-ice or shift-level metrics

**The limitation.** Production is measured exclusively in goals, assists, points, and plus/minus. The dataset contains no on-ice metrics (CF%, xGF%, scoring chances), no shift-level data (matchup minutes, zone starts), and no advanced shot quality (xG, high-danger chances).

**Impact.** Phase 1 already noted that McDavid's *points* hold up better than the popular narrative suggests, but his *plus/minus* tells a darker story. The metric where the gap most likely lives — even-strength on-ice goal differential against elite goaltenders — is exactly the metric the dataset cannot quantify. H3 (matchup-specific suppression) is testable in spirit but not in detail.

**What would resolve it.** Integrating Natural Stat Trick or MoneyPuck data, both of which provide game-level on-ice and expected-goals metrics. This is a known Phase 5+ extension.

---

## 5. No goalie-specific features

**The limitation.** The Hellebuyck and Bobrovsky claims rely on opponent identification (USA, FLA) and game context, not on goalie-specific stats. There is no `opposing_goalie_save_pct` feature.

**Impact.** Phase 3's `opp_ga_per_game` captures team defensive quality (system + goalie combined) but cannot isolate the goalie. If FLA's defensive system without Bobrovsky would still suppress McDavid, the dataset cannot tell us.

**What would resolve it.** Per-game starting-goalie data (NHL API boxscore endpoint) joined to per-season goalie save% and high-danger save%. Modest engineering, would substantially sharpen H3.

---

## 6. Phase 3 is scoped to NHL games only

**The limitation.** The Ridge regression model in Phase 3 is trained and evaluated only on McDavid's NHL games. The Four Nations Face-Off and 2026 Winter Olympics are excluded.

**Impact.** Phase 3 cannot speak to international contexts. The Olympic gold medal game and Four Nations games are not part of any predictive claim Phase 3 makes.

**Why this scoping was chosen.** International opponents have no `opp_ga_per_game` (different leagues, no NHL standings) and the original chronological split put international games in test-only — forcing zero coefficients on contexts the model never trained on. Scoping out is more honest than imputing or pretending. Phases 1 and 2 retain full international coverage and carry that part of the analysis.

**What would resolve it.** Manual data entry for international team strength (Olympics group standings, IIHF rankings) — small, finite work but not currently in scope.

---

## 7. Team construction (H2) is not directly tested

**The limitation.** H2 (Edmonton's team construction fails around McDavid) requires team-level features the dataset does not currently include: linemate ice time, on-ice GF/60, secondary scoring distribution, defensive pair quality.

**Impact.** Phase 1 observes that team goals decline alongside McDavid's metrics in the Stanley Cup Finals (consistent with H2), and the Four Nations / Olympics data complicates H2 (elite supporting cast, still failed in the gold medal game). But no formal test of H2 exists in any phase.

**What would resolve it.** Same dataset extension as #4 (Natural Stat Trick / MoneyPuck) would supply line-level and on-ice metrics. Would also benefit from per-game lineup data.

---

## 8. Team stats are season snapshots, not game-date specific

**The limitation.** `opp_ga_per_game` is computed from end-of-regular-season standings for each NHL season. A team's GA/game on March 1 may differ from its end-of-season figure (trade-deadline moves, goalie injuries).

**Impact.** Modest. The feature captures full-season opponent quality, not in-game opponent state. For a model already operating at low predictive resolution, this is unlikely to materially shift conclusions, but it is a known approximation.

**What would resolve it.** Rolling 30-day or trailing-N-game GA/game per opponent, computed from game-by-game team scores. Available from the NHL API; minor engineering.

---

## 9. `rest_days` is computed from McDavid game gaps, not actual schedule

**The limitation.** The `rest_days` feature is the gap between consecutive games *in the dataset*, not the actual gap on Edmonton's calendar. If McDavid sat out a game (rest, injury, healthy scratch), the feature treats the next game as if no rest occurred between his appearances.

**Impact.** Small. McDavid rarely sits, and the model's `rest_days` coefficient is near zero (−0.008) anyway. But the feature is technically a misstatement when McDavid misses a team game.

**What would resolve it.** Pulling Edmonton's full team schedule and computing rest from team-game-to-team-game, then joining to McDavid's game log. Trivial via the NHL API.

---

## 10. International elimination flagging is rule-based but coarse

**The limitation.** International knockout games (quarterfinals, semifinals, finals) are flagged as elimination games unconditionally. This treats all knockout games as equivalent in pressure.

**Impact.** Minor. The Four Nations final was a championship game with elimination structure; the Olympic quarterfinals had different stakes than the gold medal game. The current rule does not differentiate.

**What would resolve it.** A more granular `pressure_score` feature (medal-round = 3, semifinal = 2, quarterfinal = 1, group = 0). Cosmetic improvement; unlikely to change conclusions given small n.

---

## What this list is for

The intent here is to make every consumer of this project — recruiter, future-self, or anyone evaluating the work — aware of the boundaries before they over-read the conclusions. The reframed thesis the project supports is narrower than the original framing, and that narrowing is documented in the notebook synthesis sections. This file collects the structural reasons that narrowing was necessary.

The corresponding strength of the project: every limitation listed here is documented, quantified where possible, and tied to a specific phase's analytical claims. The project does not silently overreach.
