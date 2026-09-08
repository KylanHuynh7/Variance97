import { Callout, Disclosure, PageHeader, Rule } from "@/components/ui";

export const metadata = { title: "Limitations" };

const FULL_LIST: { key: string; title: React.ReactNode; body: React.ReactNode }[] = [
  {
    key: "sample-size",
    title: "Sample size in high-stakes contexts",
    body: (
      <p>
        Stanley Cup Finals n=13, elimination losses n=4, games versus Hellebuyck
        n=3, Olympic gold medal game n=1. No Phase 2 test reaches significance at
        α=0.05, let alone the Bonferroni-corrected α=0.0125. Cohen&rsquo;s d is
        reported for every test as the more honest quantification.
      </p>
    ),
  },
  {
    key: "single-peer",
    title: "A single peer in the comparison",
    body: (
      <p>
        MacKinnon is a defensible choice — same era, similar usage, won the Cup
        in 2022 — but one peer is one data point. Adding Matthews, Crosby, or
        Draisaitl would let us report McDavid&rsquo;s decline against the{" "}
        <em>distribution</em> of peer declines rather than a single comparison.
      </p>
    ),
  },
  {
    key: "points-only",
    title: "Points only, with no on-ice or shift-level metrics",
    body: (
      <p>
        Production is measured in goals, assists, points, and plus/minus. There
        is no Corsi, Fenwick, expected goals, scoring chances, or zone starts.
        The metric where the H3 gap most likely lives — even-strength on-ice goal
        differential against elite goaltenders — is precisely the one this
        dataset cannot quantify. Natural Stat Trick or MoneyPuck integration is
        the known follow-on.
      </p>
    ),
  },
  {
    key: "no-goalie",
    title: "No goalie-specific features",
    body: (
      <p>
        <code>opp_ga_per_game</code> captures team defensive quality — system and
        goaltender combined — but cannot isolate the goaltender. Without
        per-game starter data plus save percentage and high-danger save
        percentage, the claim can only be &ldquo;versus the United States in this
        tournament window,&rdquo; never &ldquo;Hellebuyck specifically.&rdquo;
      </p>
    ),
  },
  {
    key: "nhl-only",
    title: "The model is scoped to NHL games only",
    body: (
      <p>
        International contexts have no <code>opp_ga_per_game</code> — different
        leagues, no NHL standings — and the original chronological train/test
        split forced zero coefficients onto contexts the model never trained on.
        Phase 3 is deliberately honest about what it can speak to; Phases 1 and 2
        retain full international coverage.
      </p>
    ),
  },
  {
    key: "h2-untested",
    title: "Team construction (H2) is never directly tested",
    body: (
      <p>
        Linemate ice time, on-ice goals for per 60, secondary scoring
        distribution, defensive pair quality — none of it is in the dataset.
        Phase 1 observes that Edmonton&rsquo;s team goals decline alongside
        McDavid&rsquo;s metrics in the Finals, which is consistent with H2, but
        no formal test of H2 exists in any phase.
      </p>
    ),
  },
  {
    key: "season-snapshots",
    title: "Team stats are season snapshots, not game-date specific",
    body: (
      <p>
        <code>opp_ga_per_game</code> uses end-of-season standings. A
        team&rsquo;s goals-against rate on March 1 may differ from its final
        figure after deadline moves or goaltender injuries. For a model already
        operating at low predictive resolution this is unlikely to shift
        conclusions, but it is a known approximation.
      </p>
    ),
  },
  {
    key: "rest-days",
    title: (
      <>
        <code>rest_days</code> is computed from McDavid&rsquo;s game gaps
      </>
    ),
    body: (
      <p>
        Not from Edmonton&rsquo;s actual schedule. If McDavid sat out a team game
        for rest or injury, the feature treats the next game as though no rest
        occurred. He rarely sits and the coefficient is near zero regardless, but
        the feature is technically a misstatement whenever he misses a team game.
      </p>
    ),
  },
];

export default function LimitationsPage() {
  return (
    <>
      <PageHeader
        kicker="Limitations"
        title="What this cannot tell you"
        dek={
          <>
            These are structural boundaries, not defects. Any honest version of
            this analysis has to state them before it states its conclusions.
          </>
        }
      />

      <h2>Two confounds you cannot resolve with this dataset</h2>

      <Callout kind="caveat" label="Confound 1">
        <p>
          <strong>Florida and the Stanley Cup Finals are perfectly entangled.</strong>{" "}
          Edmonton&rsquo;s only two Finals appearances in this dataset are both
          against the Panthers, in 2024 and 2025. Every &ldquo;Stanley Cup
          Finals&rdquo; row is also a &ldquo;versus Florida&rdquo; row, so the two
          effects cannot be separated statistically.
        </p>
        <p>
          Any claim that <em>McDavid struggles in the Finals</em> is
          observationally identical to{" "}
          <em>McDavid struggles against the 2023&ndash;25 Panthers</em>.
        </p>
      </Callout>

      <Callout kind="caveat" label="Confound 2">
        <p>
          <strong>The Hellebuyck sample is three games.</strong> All three fall
          inside a single tournament window — the 2025 Four Nations and the 2026
          Olympics. With n=3 the <em>direction</em> is unambiguous, but the{" "}
          <em>magnitude</em> is unstable: one different result moves the estimate
          substantially.
        </p>
        <p>Phase 2 reports it as a pattern observation, not a tested effect.</p>
      </Callout>

      <Rule />

      <h2>The full list</h2>
      <div>
        {FULL_LIST.map((item) => (
          <Disclosure key={item.key} summary={item.title}>
            {item.body}
          </Disclosure>
        ))}
      </div>

      <p style={{ marginTop: "2rem" }}>
        The expanded version of this list, with what would resolve each item,
        lives in{" "}
        <a
          href="https://github.com/KylanHuynh7/Variance97/blob/main/LIMITATIONS.md"
          target="_blank"
          rel="noreferrer"
        >
          <code>LIMITATIONS.md</code>
        </a>
        . Every item here is documented, quantified where possible, and tied to a
        specific phase&rsquo;s claims. The project does not silently overreach.
      </p>
    </>
  );
}
