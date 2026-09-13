import { Callout, DataTable, Figure, PageHeader, Rule, Stat, StatRow } from "@/components/ui";
import { fmt, fmtSigned } from "@/lib/charts";
import {
  NHL_CONTEXT_ORDER,
  PlayerSummary,
  chartContextLabel,
  contextLabel,
  peers,
  peersWithFinals,
  subject,
} from "@/lib/data";
import DropDistribution from "./DropDistribution";
import PeerExplorer, { PeerStats } from "./PeerExplorer";

export const metadata = { title: "The peer test" };

const rsIdx = NHL_CONTEXT_ORDER.indexOf("regular_season");
const scfIdx = NHL_CONTEXT_ORDER.indexOf("stanley_cup_finals");

/** A drop in points per game, and the same drop as a share of the baseline. */
function dropOf(p: PlayerSummary) {
  const rs = p.means.points[rsIdx]!;
  const scf = p.means.points[scfIdx];
  if (scf === null) return null;
  return { absolute: scf - rs, relative: (scf - rs) / rs, rs, scf };
}

export default function PeerComparisonPage() {
  const withFinals = [subject, ...peersWithFinals].sort(
    (a, b) => b.scf_drop! - a.scf_drop!,
  );
  const withoutFinals = peers.filter((p) => p.scf_drop === null);

  const rows = withFinals.map((p) => ({
    name: p.short_name,
    value: p.scf_drop!,
    isSubject: p.role === "subject",
  }));

  const subjectDrop = dropOf(subject)!;
  const steeper = peersWithFinals.filter((p) => p.scf_drop! < subjectDrop.absolute);
  const shallower = peersWithFinals.filter((p) => p.scf_drop! > subjectDrop.absolute);

  const stats: PeerStats = {
    contexts: NHL_CONTEXT_ORDER,
    labels: NHL_CONTEXT_ORDER.map(contextLabel),
    chartLabels: NHL_CONTEXT_ORDER.map(chartContextLabel),
    subject: {
      key: subject.key,
      short_name: subject.short_name,
      note: subject.note,
      counts: subject.counts,
      means: subject.means,
    },
    peers: peers.map((p) => ({
      key: p.key,
      short_name: p.short_name,
      note: p.note,
      counts: p.counts,
      means: p.means,
    })),
  };

  return (
    <>
      <PageHeader
        kicker="The peer test"
        title="Compared to whom?"
        dek={
          <>
            A decline only means something against a baseline. This page uses
            five &mdash; and McDavid&rsquo;s lands in the middle of them.
          </>
        }
      />

      <p className="lede">
        For most of this project the comparison was Nathan MacKinnon alone, and
        one peer is one data point. The peer group is now five elite centres of
        the same era, picked on role and usage before anyone looked at their
        numbers. Three of them reached a Stanley Cup Final in the window. Two
        did not, which is part of the distribution rather than a reason to drop
        them.
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
            Every row is labelled, so the highlight marks the subject rather
            than carrying the meaning. Zero is a real position on this axis and
            one player is on it.
          </>
        }
      >
        <DropDistribution rows={rows} />
      </Figure>

      <DataTable
        caption="The values plotted in Fig. 1. The relative column expresses the same drop as a share of that player's own regular-season rate."
        columns={[
          { key: "player", header: "Player" },
          { key: "rs", header: "Regular season", numeric: true },
          { key: "scf", header: "Finals", numeric: true },
          { key: "abs", header: "Change", numeric: true },
          { key: "rel", header: "Relative", numeric: true },
          { key: "n", header: "n (Finals)", numeric: true },
        ]}
        rows={withFinals.map((p) => {
          const d = dropOf(p)!;
          return {
            player: p.short_name,
            rs: fmt(d.rs),
            scf: fmt(d.scf),
            abs: fmtSigned(d.absolute),
            rel: `${fmtSigned(d.relative * 100, 0)}%`,
            n: p.scf_games,
          };
        })}
      />

      <StatRow>
        <Stat
          label="McDavid"
          value={fmtSigned(subjectDrop.absolute)}
          unit="pts/game"
          accent
          note={`${fmtSigned(subjectDrop.relative * 100, 0)}% of his regular-season rate.`}
        />
        <Stat
          label="Peers who fell further"
          value={`${steeper.length} of ${peersWithFinals.length}`}
          note={steeper.map((p) => p.short_name).join(", ") || "none"}
        />
        <Stat
          label="Peers who held up better"
          value={`${shallower.length} of ${peersWithFinals.length}`}
          note={shallower.map((p) => p.short_name).join(", ") || "none"}
        />
      </StatRow>

      <p>
        The single-peer version of this page said McDavid&rsquo;s decline was
        half MacKinnon&rsquo;s and left it there. The distribution says
        something more defensible and less flattering:{" "}
        <strong>
          McDavid is neither the outlier the narrative claims nor the standout
          the earlier framing implied.
        </strong>{" "}
        He sits mid-pack. Two peers fell further, one did not fall at all.
      </p>

      <Rule />

      <h2>The two peers worth naming individually</h2>

      <Callout kind="key" label="Draisaitl — the same two series">
        <p>
          Leon Draisaitl played the same two Finals as McDavid, against the same
          opponent, behind the same defence, and his decline is the steepest of
          anyone here at {fmtSigned(peers.find((p) => p.key === "draisaitl")!.scf_drop!)}{" "}
          points per game. He is not an independent draw from &ldquo;elite
          forwards&rdquo; &mdash; he is a within-team control, which is what
          makes him useful. Whatever Florida did to Edmonton, it was done to
          both of them, and McDavid absorbed it better.
        </p>
      </Callout>

      <Callout kind="key" label="Eichel — the same Panthers, a different result">
        <p>
          Jack Eichel is the only peer whose Finals sample is more than one
          series, and the only one to have faced the team McDavid is confounded
          with. Vegas beat those Panthers in 2023, and Eichel scored{" "}
          {fmt(
            peers
              .find((p) => p.key === "eichel")!
              .scf_series.find((s) => s.opponent === "FLA")!.points_per_game,
          )}{" "}
          points per game doing it &mdash; above his own regular-season rate.
          That does not dissolve the Florida confound in McDavid&rsquo;s data,
          which is about Edmonton&rsquo;s Finals and stays exactly as entangled
          as it was. It does mean &ldquo;the Panthers system suppresses elite
          centres&rdquo; is not a general law: one of them went through it.
        </p>
      </Callout>

      <DataTable
        caption="Every Stanley Cup Finals series played by anyone in this group, during the window."
        columns={[
          { key: "player", header: "Player" },
          { key: "season", header: "Season" },
          { key: "opp", header: "Opponent" },
          { key: "record", header: "W–L" },
          { key: "ppg", header: "Pts/game", numeric: true },
        ]}
        rows={withFinals.flatMap((p) =>
          p.scf_series.map((s) => ({
            player: p.short_name,
            season: s.season,
            opp: s.opponent,
            record: `${s.record.replace("-", "–")}${s.won ? " (won)" : ""}`,
            ppg: fmt(s.points_per_game),
          })),
        )}
      />

      <Rule />

      <h2>One peer at a time, in detail</h2>
      <p>
        Fig. 1 answers where McDavid sits among all of them. This answers how he
        compares to any one of them across every round, including the two peers
        with no Finals appearance to contribute.
      </p>

      <PeerExplorer stats={stats} />

      <Rule />

      <h2>What this rules in and out</h2>
      <ul>
        <li>
          <strong>It still rules out the strongest version of H1.</strong> If
          McDavid&rsquo;s Finals output were unusually low for an elite forward,
          he would be at the bottom of this distribution. He is in the middle of
          it, above two of three peers.
        </li>
        <li>
          <strong>It weakens the reverse claim too.</strong> &ldquo;His decline
          is half his peer&rsquo;s&rdquo; was true of the peer we happened to
          pick. Against Eichel it runs the other way.
        </li>
        <li>
          <strong>Baselines differ, and that flatters whoever scores least.</strong>{" "}
          Holding a 1.09 rate is not the same feat as holding a 1.67 one, so the
          table reports the relative drop beside the absolute one. The ordering
          happens to be identical either way.
        </li>
        <li>
          <strong>Three Finals peers is still a small distribution.</strong> Two
          of the five never got there, and the samples run from 6 to 13 games.
          This is a better baseline than one peer, not a tested effect.
        </li>
      </ul>

      <Callout kind="caveat" label="The peers without a Finals appearance">
        <p>
          {withoutFinals.map((p) => p.short_name).join(" and ")} reached no
          Stanley Cup Final between 2021&ndash;22 and 2025&ndash;26, so they
          contribute to the earlier rounds in Fig. 2 and nothing to Fig. 1. They
          are kept in the group deliberately. Dropping a peer for having a short
          playoff record after seeing that record is how a comparison group gets
          quietly curated into the answer you wanted.
        </p>
      </Callout>
    </>
  );
}
