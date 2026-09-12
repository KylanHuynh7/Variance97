import Link from "next/link";
import DropDistribution from "./peer-comparison/DropDistribution";
import { Callout, DataTable, Figure, PageHeader, Rule, Stat, StatRow } from "@/components/ui";
import { fmt, fmtSigned } from "@/lib/charts";
import {
  contextMean,
  mcdavid,
  mean,
  peers,
  peersWithFinals,
  subject,
} from "@/lib/data";

export default function HomePage() {
  const mcdDrop =
    contextMean(mcdavid, "stanley_cup_finals") -
    contextMean(mcdavid, "regular_season");

  // The most recent playoff series, called out by name rather than folded
  // into the first-round average. It is the one series in the window that
  // runs against the argument this page makes, so it is stated here.
  const latestSeason = mcdavid
    .map((g) => g.season)
    .reduce((a, b) => (b > a ? b : a), "");
  const latestExit = mcdavid.filter(
    (g) => g.season === latestSeason && g.game_context === "first_round",
  );
  const latestExitPpg = mean(latestExit.map((g) => g.points));
  const latestExitDrop = latestExitPpg - contextMean(mcdavid, "regular_season");

  // Where the subject's Finals decline lands among the peers who reached one.
  const steeper = peersWithFinals.filter((p) => p.scf_drop! < subject.scf_drop!);
  const shallower = peersWithFinals.filter((p) => p.scf_drop! > subject.scf_drop!);
  const withFinals = [subject, ...peersWithFinals].sort(
    (a, b) => b.scf_drop! - a.scf_drop!,
  );
  const dropRows = withFinals.map((p) => ({
    name: p.short_name,
    value: p.scf_drop!,
    isSubject: p.role === "subject",
  }));

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
        That last number is the one the narrative rests on, and on its own it
        means nothing at all — every elite forward scores less in a Final. It
        only means something next to a comparison, so this project measures it
        against five: the elite centres of the same era.{" "}
        <strong>
          Of the {peersWithFinals.length} who reached a Final in this window,{" "}
          {steeper.length} fell further than McDavid and {shallower.length} did
          not.
        </strong>{" "}
        He is mid-pack — which is neither the collapse the narrative claims nor
        the standout an earlier version of this page implied when it compared
        him to one peer.
      </p>

      <Figure
        title="McDavid&rsquo;s Finals decline, against his peers&rsquo;"
        subtitle="Change in points per game from the regular season to the Stanley Cup Finals, 2021–22 through 2025–26."
        legend={[
          { label: "McDavid", color: "var(--c-mcdavid)" },
          { label: "Peer", color: "var(--c-neutral-mark)" },
        ]}
        number={1}
        caption={
          <>
            Elite centres of the same era, chosen on role and usage. Two more —{" "}
            {peers
              .filter((p) => p.scf_drop === null)
              .map((p) => p.short_name)
              .join(" and ")}{" "}
            — reached no Final in the window and so appear on the{" "}
            <Link href="/peer-comparison">peer page</Link> rather than here.
            Samples run from {Math.min(...withFinals.map((p) => p.scf_games))} to{" "}
            {Math.max(...withFinals.map((p) => p.scf_games))} games.
          </>
        }
      >
        <DropDistribution rows={dropRows} />
      </Figure>

      <StatRow>
        <Stat
          label="McDavid, RS → Finals"
          value={fmtSigned(subject.scf_drop!)}
          unit="pts/game"
          accent
          note={`n=${subject.scf_games} Finals games, across two series.`}
        />
        <Stat
          label="Fell further"
          value={`${steeper.length} of ${peersWithFinals.length}`}
          note={steeper.map((p) => p.short_name).join(", ")}
        />
        <Stat
          label="Held up better"
          value={`${shallower.length} of ${peersWithFinals.length}`}
          note={shallower.map((p) => p.short_name).join(", ")}
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

      <p>
        One series complicates that, and it is the most recent one. Edmonton
        lost the {latestSeason} first round to {latestExit[0]?.opponent} in{" "}
        {latestExit.length} games, and McDavid scored at {fmt(latestExitPpg)} points
        per game — a drop of {fmt(Math.abs(latestExitDrop))}, larger than his
        own Finals drop and larger than any peer&rsquo;s. It is one short series
        against a single opponent, so it does not overturn the comparison
        above. It is worth naming anyway: it is the newest evidence in the
        dataset, and his lowest-scoring playoff series in it.{" "}
        <Link href="/three-acts">Act I</Link> breaks it out by season.
      </p>

      <DataTable
        caption="The values plotted in Fig. 1. Relative expresses the same change as a share of that player's own regular-season rate, since holding a lower rate is an easier thing to do."
        columns={[
          { key: "player", header: "Player" },
          { key: "rs", header: "Regular season", numeric: true },
          { key: "scf", header: "Finals", numeric: true },
          { key: "abs", header: "Change", numeric: true },
          { key: "rel", header: "Relative", numeric: true },
          { key: "n", header: "n (Finals)", numeric: true },
        ]}
        rows={withFinals.map((p) => {
          const rs = p.means.points[0]!;
          const scf = p.means.points[4]!;
          return {
            player: p.short_name,
            rs: fmt(rs),
            scf: fmt(scf),
            abs: fmtSigned(p.scf_drop!),
            rel: `${fmtSigned((p.scf_drop! / rs) * 100, 0)}%`,
            n: p.scf_games,
          };
        })}
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
