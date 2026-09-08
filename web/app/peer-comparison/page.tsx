import { PageHeader, Rule } from "@/components/ui";
import {
  NHL_CONTEXT_ORDER,
  NumericGameKey,
  chartContextLabel,
  contextLabel,
  countByContext,
  mackinnon,
  mcdavid,
  meanByContext,
} from "@/lib/data";
import PeerExplorer, { PeerStats } from "./PeerExplorer";

export const metadata = { title: "The peer test" };

const METRIC_KEYS: NumericGameKey[] = [
  "points",
  "goals",
  "assists",
  "plus_minus",
];

export default function PeerComparisonPage() {
  const means: PeerStats["means"] = {};
  for (const key of METRIC_KEYS) {
    means[key] = {
      mcdavid: meanByContext(mcdavid, NHL_CONTEXT_ORDER, key),
      mackinnon: meanByContext(mackinnon, NHL_CONTEXT_ORDER, key),
    };
  }

  const stats: PeerStats = {
    contexts: NHL_CONTEXT_ORDER,
    labels: NHL_CONTEXT_ORDER.map(contextLabel),
    chartLabels: NHL_CONTEXT_ORDER.map(chartContextLabel),
    counts: {
      mcdavid: countByContext(mcdavid, NHL_CONTEXT_ORDER),
      mackinnon: countByContext(mackinnon, NHL_CONTEXT_ORDER),
    },
    means,
  };

  return (
    <>
      <PageHeader
        kicker="The peer test"
        title="Compared to whom?"
        dek={
          <>
            A decline only means something against a baseline. Nathan MacKinnon
            is the cleanest one available — and the comparison runs the opposite
            way to the narrative.
          </>
        }
      />

      <p className="lede">
        MacKinnon is the closest thing to a controlled comparison this dataset
        allows: the same era, similar usage, a playoff appearance in every year
        of the McDavid window, and a Stanley Cup in 2022. If McDavid uniquely
        collapsed in the Finals, this is the comparison that would catch it.
      </p>

      <PeerExplorer stats={stats} />

      <Rule />

      <h2>What this rules in and out</h2>
      <ul>
        <li>
          <strong>It rules out the cleanest version of H1.</strong> If
          McDavid&rsquo;s Finals output were unusually low for an elite forward,
          MacKinnon&rsquo;s would be the floor. It isn&rsquo;t — MacKinnon fell
          further.
        </li>
        <li>
          <strong>It does not address H3.</strong> Whether specific matchups —
          Bobrovsky, Hellebuyck — suppress McDavid in particular is a different
          question, and the model page is the closest this project gets to it.
        </li>
        <li>
          <strong>One peer is one data point.</strong> MacKinnon&rsquo;s Finals
          sample is a single series, the 2022 sweep of Tampa. Adding Matthews,
          Crosby, or Draisaitl would let us compare McDavid&rsquo;s decline
          against a distribution of peer declines rather than one number.
        </li>
      </ul>
    </>
  );
}
