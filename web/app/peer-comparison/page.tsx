import { Divider } from "@/components/ui";
import {
  NHL_CONTEXT_ORDER,
  NumericGameKey,
  contextLabel,
  countByContext,
  mackinnon,
  mcdavid,
  meanByContext,
} from "@/lib/data";
import PeerExplorer, { PeerStats } from "./PeerExplorer";

export const metadata = { title: "Peer Comparison · Variance97" };

const METRIC_KEYS: NumericGameKey[] = ["points", "goals", "assists", "plus_minus"];

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
    counts: {
      mcdavid: countByContext(mcdavid, NHL_CONTEXT_ORDER),
      mackinnon: countByContext(mackinnon, NHL_CONTEXT_ORDER),
    },
    means,
  };

  return (
    <>
      <h1 className="page-title">Peer Comparison — McDavid vs MacKinnon</h1>
      <p>
        MacKinnon is the cleanest peer benchmark available: same era, similar
        usage, made the playoffs every year of the McDavid window, and won the
        Cup in 2022. If McDavid uniquely collapsed in the Stanley Cup Finals,
        this is the comparison that would catch it.
      </p>

      <PeerExplorer stats={stats} />

      <Divider />

      <h2>What this comparison rules in and out</h2>
      <ul>
        <li>
          <strong>Rules out (the cleanest version of) H1.</strong> If
          McDavid&rsquo;s individual Finals output were unusually low for an
          elite forward, MacKinnon&rsquo;s would be the floor. It isn&rsquo;t —
          MacKinnon dropped further.
        </li>
        <li>
          <strong>Doesn&rsquo;t address H3.</strong> Whether <em>specific</em>{" "}
          matchups (Bobrovsky, Hellebuyck) suppress McDavid uniquely is a
          different question. See the Feature Contributions page for a
          model-based attempt at that.
        </li>
        <li>
          <strong>Sample-size caveat.</strong> MacKinnon&rsquo;s Stanley Cup
          Finals n=6 (one series — the 2022 sweep over Tampa). The peer baseline
          is one tournament data point, not a stable estimate. Listed in
          Limitations.
        </li>
      </ul>
    </>
  );
}
