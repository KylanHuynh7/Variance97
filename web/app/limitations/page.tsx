import { Callout, Divider } from "@/components/ui";

export const metadata = { title: "Limitations · Variance97" };

const FULL_LIST: { title: React.ReactNode; key?: string; body: React.ReactNode }[] = [
  {
    title: "1. Sample size in high-stakes contexts",
    body: (
      <>
        Stanley Cup Finals (n=13), elimination losses (n=4), games vs Hellebuyck
        (n=3), Olympic gold medal game (n=1). No Phase 2 test reaches
        significance at α=0.05 or Bonferroni-corrected α=0.0125. Cohen&rsquo;s d
        is reported for every test as the more honest quantification.
      </>
    ),
  },
  {
    title: "2. Single peer in the comparison",
    body: (
      <>
        MacKinnon is a defensible choice (same era, similar usage, won the Cup in
        2022) but a single peer is a single data point. Adding Matthews / Crosby
        / Draisaitl would let us report McDavid&rsquo;s drop relative to the{" "}
        <em>distribution</em> of peer drops, not a single comparison.
      </>
    ),
  },
  {
    title: "3. Points only, no on-ice or shift-level metrics",
    body: (
      <>
        Production is measured in goals, assists, points, plus/minus. No Corsi,
        Fenwick, expected goals, scoring chances, or zone starts. The metric
        where the H3 gap most likely lives — even-strength on-ice goal
        differential vs elite goalies — is precisely the metric the dataset
        can&rsquo;t quantify. Natural Stat Trick / MoneyPuck integration is a
        known follow-on.
      </>
    ),
  },
  {
    title: "4. No goalie-specific features",
    body: (
      <>
        <code>opp_ga_per_game</code> captures team defensive quality (system +
        goalie combined) but cannot isolate the goalie. Without per-game
        starting-goalie data plus save% / high-danger save%, we can&rsquo;t say
        &ldquo;Hellebuyck specifically&rdquo; — only &ldquo;vs USA in this
        tournament window.&rdquo;
      </>
    ),
  },
  {
    title: "5. Phase 3 is scoped to NHL games only",
    body: (
      <>
        International contexts have no <code>opp_ga_per_game</code> (different
        leagues, no NHL standings) and the original chronological train/test
        split forced zero coefficients on contexts the model never trained on.
        Phase 3 is honest about what it can speak to (NHL games); Phases 1 and 2
        retain full international coverage.
      </>
    ),
  },
  {
    title: "6. Team construction (H2) is not directly tested",
    body: (
      <>
        Linemate ice time, on-ice GF/60, secondary scoring distribution,
        defensive pair quality — none of these are in the dataset. Phase 1
        observes that Edmonton&rsquo;s team goals decline alongside
        McDavid&rsquo;s metrics in the Finals (consistent with H2), but no formal
        test of H2 exists in any phase.
      </>
    ),
  },
  {
    title: "7. Team stats are season snapshots, not game-date specific",
    body: (
      <>
        <code>opp_ga_per_game</code> uses end-of-season standings. A team&rsquo;s
        GA/game on March 1 may differ from its end-of-season figure
        (trade-deadline moves, goalie injuries). For a model already operating at
        low predictive resolution, this is unlikely to materially shift
        conclusions, but it is a known approximation.
      </>
    ),
  },
  {
    title: (
      <>
        8. <code>rest_days</code> is computed from McDavid game gaps
      </>
    ),
    key: "rest-days",
    body: (
      <>
        Not from Edmonton&rsquo;s actual schedule. If McDavid sat out a team game
        (rest, injury), the feature treats the next game as if no rest occurred.
        McDavid rarely sits and the coefficient is near zero anyway, but the
        feature is technically a misstatement when he misses a team game.
      </>
    ),
  },
];

export default function LimitationsPage() {
  return (
    <>
      <h1 className="page-title">Limitations</h1>
      <p>
        These are the structural boundaries of the project. They are not bugs —
        they are facts about the data and the methodology that any honest
        analysis has to flag.
      </p>

      <h2>Two confounds you cannot resolve with this dataset</h2>
      <div className="card-row">
        <div className="card">
          <Callout kind="error">
            <p>
              <strong>
                Florida ↔ Stanley Cup Finals is a perfect confound.
              </strong>
            </p>
            <p>
              Edmonton&rsquo;s only two Stanley Cup Finals appearances in the
              dataset are both against the Florida Panthers (2024 and 2025).
              Every &ldquo;Stanley Cup Finals&rdquo; row in the McDavid dataset
              is also a &ldquo;vs Florida&rdquo; row. Statistically, the two
              effects cannot be separated.
            </p>
            <p>
              Any claim that <em>&ldquo;McDavid struggles in the Finals&rdquo;</em>{" "}
              is observationally identical to{" "}
              <em>&ldquo;McDavid struggles vs the 2023&ndash;25 Panthers.&rdquo;</em>
            </p>
          </Callout>
        </div>
        <div className="card">
          <Callout kind="error">
            <p>
              <strong>The Hellebuyck sample is n=3.</strong>
            </p>
            <p>
              All three McDavid-vs-Hellebuyck games happen in a single tournament
              window (2025 Four Nations + 2026 Olympics). With only three games,
              the <em>direction</em> of the effect is unambiguous (McDavid scored
              less) but the <em>magnitude</em> is unstable — one different result
              and the estimate shifts dramatically.
            </p>
            <p>
              Phase 2 reports this as a pattern observation, not a tested effect.
            </p>
          </Callout>
        </div>
      </div>

      <Divider />

      <h2>The full list</h2>
      {FULL_LIST.map((item) => (
        <details key={item.key ?? String(item.title)}>
          <summary>{item.title}</summary>
          <p>{item.body}</p>
        </details>
      ))}

      <Divider />

      <p>
        The full version of this list, with what would resolve each limitation,
        lives at{" "}
        <a
          href="https://github.com/KylanHuynh7/Variance97/blob/main/LIMITATIONS.md"
          target="_blank"
          rel="noreferrer"
        >
          <code>LIMITATIONS.md</code>
        </a>{" "}
        in the repo. The corresponding strength of the project: every item here
        is documented, quantified where possible, and tied to a specific
        phase&rsquo;s claims. The project does not silently overreach.
      </p>
    </>
  );
}
