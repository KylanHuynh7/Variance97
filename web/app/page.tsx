import Plot from "@/components/Plot";
import { Callout, Divider, Metric, MetricRow } from "@/components/ui";
import { peerBars, peerLayout, fmtSigned } from "@/lib/charts";
import {
  NHL_CONTEXT_ORDER,
  contextLabel,
  contextMean,
  mackinnon,
  mcdavid,
  meanByContext,
} from "@/lib/data";
import { CONFOUND_CALLOUT, HEADLINE, PEER_FOOTER } from "@/lib/narrative";

export default function HomePage() {
  const labels = NHL_CONTEXT_ORDER.map(contextLabel);
  const mcd = meanByContext(mcdavid, NHL_CONTEXT_ORDER);
  const mac = meanByContext(mackinnon, NHL_CONTEXT_ORDER);

  const mcdDrop =
    contextMean(mcdavid, "stanley_cup_finals") -
    contextMean(mcdavid, "regular_season");
  const macDrop =
    contextMean(mackinnon, "stanley_cup_finals") -
    contextMean(mackinnon, "regular_season");

  return (
    <>
      <h1 className="page-title">Variance97</h1>
      <p className="caption">
        A data-science investigation of Connor McDavid&rsquo;s performance in
        high-stakes hockey: the NHL Stanley Cup Playoffs, the 2025 Four Nations
        Face-Off, and the 2026 Winter Olympics.
      </p>

      {HEADLINE}

      <h2>McDavid vs MacKinnon — points per game by NHL context</h2>
      <Plot
        data={peerBars(labels, mcd, mac)}
        layout={peerLayout("Points per game")}
        height={380}
        ariaLabel="Grouped bar chart comparing McDavid and MacKinnon points per game across NHL contexts"
      />

      <MetricRow>
        <Metric
          label="McDavid: regular season → SCF"
          value={`${fmtSigned(mcdDrop)} pts/game`}
          delta="Drop in points/game between regular season and Stanley Cup Finals."
        />
        <Metric
          label="MacKinnon: regular season → SCF"
          value={`${fmtSigned(macDrop)} pts/game`}
          delta="MacKinnon's drop, for comparison. He won the 2022 Cup."
        />
        <Metric
          label="Ratio"
          value={`${Math.abs(macDrop / mcdDrop).toFixed(1)}×`}
          delta="MacKinnon's drop is this many times larger than McDavid's."
        />
      </MetricRow>

      {PEER_FOOTER}

      <Divider />

      <h2>Drill in</h2>
      <div className="card-row">
        <div className="card">
          <strong>Three Acts</strong>
          <p>
            Stanley Cup Playoffs, Four Nations, Olympics — game-by-game with the
            regular-season baseline overlaid.
          </p>
        </div>
        <div className="card">
          <strong>Peer Comparison</strong>
          <p>
            Pick your own contexts and metrics. The headline finding lives here,
            with an explicit sample-size caveat.
          </p>
        </div>
        <div className="card">
          <strong>Feature Contributions</strong>
          <p>
            Per-game decomposition of the Phase 3 Ridge model. Shows what
            carries signed weight in McDavid&rsquo;s points — <em>not</em> a
            tonight&rsquo;s-game predictor.
          </p>
        </div>
      </div>

      <Callout kind="info">{CONFOUND_CALLOUT}</Callout>
    </>
  );
}
