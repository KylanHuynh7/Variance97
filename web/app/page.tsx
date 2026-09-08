import Link from "next/link";
import PeerFigure from "./PeerFigure";
import { Callout, DataTable, Figure, PageHeader, Rule, Stat, StatRow } from "@/components/ui";
import { fmt, fmtSigned } from "@/lib/charts";
import {
  NHL_CONTEXT_ORDER,
  chartContextLabel,
  contextLabel,
  contextMean,
  countByContext,
  mackinnon,
  mcdavid,
  meanByContext,
} from "@/lib/data";

export default function HomePage() {
  const labels = NHL_CONTEXT_ORDER.map(chartContextLabel);
  const mcd = meanByContext(mcdavid, NHL_CONTEXT_ORDER);
  const mac = meanByContext(mackinnon, NHL_CONTEXT_ORDER);
  const nMcd = countByContext(mcdavid, NHL_CONTEXT_ORDER);
  const nMac = countByContext(mackinnon, NHL_CONTEXT_ORDER);

  const mcdDrop =
    contextMean(mcdavid, "stanley_cup_finals") -
    contextMean(mcdavid, "regular_season");
  const macDrop =
    contextMean(mackinnon, "stanley_cup_finals") -
    contextMean(mackinnon, "regular_season");

  return (
    <>
      <PageHeader
        kicker="The claim"
        title={
          <>
            He can&rsquo;t win
            <br />
            the big one.
          </>
        }
        dek={
          <>
            That&rsquo;s the story about Connor McDavid. The data supports
            something narrower — and considerably more interesting.
          </>
        }
      />

      <p className="lede">
        McDavid won the 2025 Four Nations Face-Off, scoring the overtime winner
        himself. He set the Olympic scoring record at the 2026 Milan Cortina
        Games with 13 points in six games. And his individual production in the
        Stanley Cup Finals falls by about {Math.abs(mcdDrop).toFixed(2)} points
        per game against his regular-season rate.
      </p>

      <p>
        That last number is the one the narrative rests on. It only means
        something next to a comparison — so here is one.{" "}
        <strong>
          Nathan MacKinnon&rsquo;s drop is roughly twice as large, and he won
          the Cup in 2022.
        </strong>
      </p>

      <Figure
        title="McDavid&rsquo;s Finals decline is smaller than his closest peer&rsquo;s"
        subtitle="Points per game by NHL context, 2021–22 through 2025–26."
        legend={[
          { label: "McDavid", color: "var(--c-mcdavid)" },
          { label: "MacKinnon", color: "var(--c-mackinnon)" },
        ]}
        number={1}
        caption={
          <>
            Both players decline as the rounds get harder. MacKinnon declines
            more. Sample sizes are small and listed in the table below — the
            Stanley Cup Finals columns are n={nMcd[4]} and n={nMac[4]}.
          </>
        }
      >
        <PeerFigure labels={labels} mcd={mcd} mac={mac} />
      </Figure>

      <StatRow>
        <Stat
          label="McDavid, RS → Finals"
          value={fmtSigned(mcdDrop)}
          unit="pts/game"
          accent
          note="Regular season to Stanley Cup Finals."
        />
        <Stat
          label="MacKinnon, RS → Finals"
          value={fmtSigned(macDrop)}
          unit="pts/game"
          note="The peer who won the Cup in 2022."
        />
        <Stat
          label="Ratio"
          value={`${Math.abs(macDrop / mcdDrop).toFixed(1)}×`}
          note="MacKinnon's decline, relative to McDavid's."
        />
      </StatRow>

      <p>
        So the working thesis isn&rsquo;t{" "}
        <em>&ldquo;McDavid underperforms in championship games.&rdquo;</em>{" "}
        It&rsquo;s narrower: his teams keep losing deep playoff runs even when
        his individual production isn&rsquo;t unusually low for an elite
        forward. Where the signal actually lives — late-series fatigue and
        opponent defensive quality — is what the rest of this investigation
        tests.
      </p>

      <DataTable
        caption="The values plotted in Fig. 1, with sample sizes."
        columns={[
          { key: "context", header: "Context" },
          { key: "mcd", header: "McDavid", numeric: true },
          { key: "nMcd", header: "n (McD)", numeric: true },
          { key: "mac", header: "MacKinnon", numeric: true },
          { key: "nMac", header: "n (Mac)", numeric: true },
        ]}
        rows={NHL_CONTEXT_ORDER.map((ctx, i) => ({
          context: contextLabel(ctx),
          mcd: fmt(mcd[i]),
          nMcd: nMcd[i],
          mac: fmt(mac[i]),
          nMac: nMac[i],
        }))}
      />

      <Callout kind="caveat" label="Two confounds bound everything here">
        <ol>
          <li>
            <strong>Florida and the Finals are perfectly entangled.</strong>{" "}
            Edmonton&rsquo;s only two Stanley Cup Finals appearances in this
            dataset are both against the Panthers. &ldquo;Finals effect&rdquo;
            and &ldquo;vs Florida effect&rdquo; cannot be separated.
          </li>
          <li>
            <strong>The Hellebuyck sample is n=3</strong>, all inside one
            tournament window.
          </li>
        </ol>
        <p>
          Neither is a bug to fix. Both are facts about the data, and the{" "}
          <Link href="/limitations">Limitations</Link> page has the full list.
        </p>
      </Callout>

      <Rule />

      <h2>Where this goes next</h2>
      <div className="card-row">
        <Link href="/three-acts" className="card-link">
          <p className="card-title">Three Acts</p>
          <p>
            The Stanley Cup Playoffs, the Four Nations Face-Off, and the
            Olympics — game by game, against his regular-season baseline.
          </p>
        </Link>
        <Link href="/peer-comparison" className="card-link">
          <p className="card-title">The peer test</p>
          <p>
            The strongest finding, with the contexts and the metric under your
            control.
          </p>
        </Link>
        <Link href="/feature-contributions" className="card-link">
          <p className="card-title">The model</p>
          <p>
            What carries signed weight once real gameplay features compete —
            and what dissolves. Not a tonight&rsquo;s-game predictor.
          </p>
        </Link>
      </div>
    </>
  );
}
