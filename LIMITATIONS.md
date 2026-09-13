# Limitations

This document records the structural limitations of Variance97's current implementation. They are not bugs — they are the honest boundaries of what the dataset and methodology can support. Each limitation is stated, its impact on the analysis is described, and what would resolve it is noted.

The project takes the position that surfacing these limitations is more analytically useful than hiding them.

---

## 1. Sample size in high-stakes contexts

**The limitation.** The contexts at the heart of the project — Stanley Cup Finals (n=13), elimination losses (n=5), games vs Hellebuyck (n=3), Olympic gold medal game (n=1), the 2025–26 first round (n=6) — have sample sizes that are structurally too small for conventional statistical inference.

This cuts both ways, and the project applies it in both directions. The small-sample caveat that protects the reframing from being over-read also applies to the 2025–26 series that runs against it: neither is a tested effect.

**Impact.** No test in Phase 2 reaches significance at either α=0.05 or the Bonferroni-corrected α=0.0125. The project compensates by reporting Cohen's d (effect size) alongside every p-value, but effect-size estimates from n=3 are themselves unstable.

**What would resolve it.** Time. As McDavid plays more deep playoff runs and international tournaments, the sample grows. Until then, Phase 2's findings are best read as effect-size patterns, not tested effects.

---

## 2. The Florida / Stanley Cup Finals confound

**The limitation.** Edmonton's only two Stanley Cup Finals appearances in the dataset are both against the Florida Panthers (2024 and 2025). Every "Stanley Cup Finals" row is also a "vs Florida" row. Statistically, the two effects cannot be separated.

**Impact.** Any claim that "McDavid struggles in the Finals" is observationally identical to "McDavid struggles vs the 2023–25 Panthers." Phase 3's ML model partially addresses this by introducing `opp_ga_per_game` as a generic opponent-strength feature, but the underlying confound in the raw data cannot be eliminated.

**What would resolve it.** Edmonton reaching the Finals against a non-Florida opponent, or expanding the dataset to include other elite forwards' Finals appearances against multiple opponents.

**A partial probe (added with the peer group).** The confound is about *Edmonton's* Finals and cannot be broken from inside McDavid's data. But another elite centre in the peer group played a Final against the same Panthers core: Jack Eichel, in 2023, when Vegas won the series 4–1 and Eichel scored 1.60 pts/game — above his 1.09 regular-season rate. That does not disentangle anything in McDavid's rows, which stay exactly as confounded as they were. It does rule out the strongest form of the generic claim: "the Panthers system suppresses elite centres" is not a law, because one went through it.

**Status note (2025–26).** Edmonton did not reach the Finals in 2025–26 — they lost the first round to Anaheim — so the confound is unchanged. That series is, however, the first evidence in the window of a large McDavid production drop that Florida cannot be blamed for: 1.00 pts/game against a 1.67 regular-season rate, a drop of 0.67, at −8. It sits in a different context (first round, not Finals) at n=6, so it does not disentangle anything. It does mean the project's reframing now has a visible counterexample, and Limitation #1 applies to it in full.

---

## 3. A small peer distribution (was: a single peer) — RESOLVED, partially

**The original limitation.** Phases 1 and 2 used Nathan MacKinnon as the sole peer baseline, and the headline finding — that McDavid's regular-season-to-Stanley-Cup-Finals drop is half MacKinnon's — rested on MacKinnon's 6-game 2022 Finals being representative of "elite forward in the Finals."

**What was done.** The peer group is now five elite centres of the same era, all pulled through the same NHL API pipeline: MacKinnon, Leon Draisaitl, Jack Eichel, Auston Matthews and Sidney Crosby. They were chosen on role and usage in the 2021–22 through 2025–26 window, before their numbers were examined.

**What changed in the conclusion.** The single-peer framing does not survive its own generalization:

| Player | RS → Finals | Relative | n |
| --- | --- | --- | --- |
| Eichel | +0.00 | +0% | 11 |
| McDavid | −0.28 | −17% | 13 |
| MacKinnon | −0.54 | −35% | 6 |
| Draisaitl | −0.61 | −42% | 13 |

McDavid is **mid-pack**, not exceptional in either direction. Two peers fell further; one did not fall at all. The claim "his decline is half a comparable peer's" was true of the peer that happened to be picked first.

**What remains.** Three peers with Finals appearances is a distribution of three, on samples of 6 to 13 games. Matthews and Crosby reached no Final in the window and contribute only to the earlier rounds. This is a better baseline than one peer; it is still not a tested effect, and Limitation #1 applies to all of it.

**Two peers are worth reading individually rather than as draws from a distribution.**

- **Draisaitl is a within-team control, not an independent peer.** He played the same two Finals as McDavid, against the same opponent, behind the same defence — and his decline is the steepest here. Whatever Florida did to Edmonton was done to both of them.
- **Eichel is the only peer to have faced the confound.** Vegas beat those same Panthers in the 2023 Final, and Eichel scored 1.60 pts/game doing it — above his own regular-season rate. See Limitation #2 for what that does and does not resolve.

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

**Impact.** Small, but larger than it used to look. This entry previously cited a `rest_days` coefficient of −0.008 and called it negligible. That number was an artifact of the offseason being counted as rest, which inflated the feature's standard deviation to 11.7 and flattened the coefficient toward zero. With the feature reset at each season boundary the coefficient is **−0.052** — still small, no longer negligible, and now worth measuring correctly. McDavid rarely sits, so the misstatement is rare; it is a misstatement all the same.

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
