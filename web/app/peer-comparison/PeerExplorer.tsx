"use client";

import { useCallback, useState } from "react";
import Plot from "@/components/Plot";
import { Callout, DataTable, Figure, Stat, StatRow } from "@/components/ui";
import { ChartTheme, fmt, fmtSigned, peerBars, peerLayout } from "@/lib/charts";

export type ExplorerPlayer = {
  key: string;
  short_name: string;
  note: string;
  counts: number[];
  means: Record<string, (number | null)[]>;
};

export type PeerStats = {
  contexts: string[];
  labels: string[];
  /** Same categories, wrapped over two lines for the chart axis. */
  chartLabels: string[];
  subject: ExplorerPlayer;
  peers: ExplorerPlayer[];
};

const METRICS = [
  { key: "points", label: "Points" },
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "plus_minus", label: "Plus / minus" },
];

/**
 * One peer at a time, deliberately.
 *
 * Six players across five contexts is thirty bars, and on a phone it is thirty
 * bars in 360 pixels. The distribution figure above already answers "where does
 * McDavid sit among all of them"; this answers "against this one, in detail",
 * which is a question about two players.
 */
export default function PeerExplorer({ stats }: { stats: PeerStats }) {
  const [selected, setSelected] = useState<string[]>(stats.contexts);
  const [metric, setMetric] = useState("points");
  const [peerKey, setPeerKey] = useState(stats.peers[0].key);

  const peer = stats.peers.find((p) => p.key === peerKey) ?? stats.peers[0];
  const subject = stats.subject;

  const toggle = (ctx: string) =>
    setSelected((prev) =>
      prev.includes(ctx) ? prev.filter((c) => c !== ctx) : [...prev, ctx],
    );

  // Canonical context order regardless of click order — and, because color
  // follows the player rather than the row, filtering never repaints a series.
  const idxs = stats.contexts
    .map((c, i) => (selected.includes(c) ? i : -1))
    .filter((i) => i >= 0);

  const chartLabels = idxs.map((i) => stats.chartLabels[i]);
  const mcd = idxs.map((i) => subject.means[metric][i]);
  const peerValues = idxs.map((i) => peer.means[metric][i]);
  const metricLabel = METRICS.find((m) => m.key === metric)!.label;
  const peerName = peer.short_name;

  const build = useCallback(
    (t: ChartTheme, w: number) => ({
      data: peerBars(t, chartLabels, mcd, peerValues, "per game", peerName),
      layout: peerLayout(t, `${metricLabel} per game`, w),
    }),
    [chartLabels, mcd, peerValues, metricLabel, peerName],
  );

  const rsIdx = stats.contexts.indexOf("regular_season");
  const scfIdx = stats.contexts.indexOf("stanley_cup_finals");
  const subjectDrop =
    subject.means.points[scfIdx]! - subject.means.points[rsIdx]!;
  const peerScf = peer.means.points[scfIdx];
  const peerDrop = peerScf === null ? null : peerScf - peer.means.points[rsIdx]!;

  const showDelta =
    metric === "points" &&
    selected.includes("regular_season") &&
    selected.includes("stanley_cup_finals");

  return (
    <>
      <div className="controls">
        <label className="control">
          <span className="control-label">Compare against</span>
          <select value={peerKey} onChange={(e) => setPeerKey(e.target.value)}>
            {stats.peers.map((p) => (
              <option key={p.key} value={p.key}>
                {p.short_name}
              </option>
            ))}
          </select>
        </label>
        <label className="control">
          <span className="control-label">Metric</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <div className="control">
          <span className="control-label" id="ctx-label">
            Contexts
          </span>
          <div className="chips" role="group" aria-labelledby="ctx-label">
            {stats.contexts.map((ctx, i) => (
              <button
                key={ctx}
                type="button"
                className="chip"
                aria-pressed={selected.includes(ctx)}
                onClick={() => toggle(ctx)}
              >
                {stats.labels[i]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="figure-sub">{peer.note}</p>

      {selected.length === 0 ? (
        <Callout kind="warn">
          <p>Select at least one context to draw the comparison.</p>
        </Callout>
      ) : (
        <>
          <Figure
            title={`${metricLabel} per game, McDavid vs ${peerName}`}
            subtitle="By NHL context, across the 2021–22 through 2025–26 window."
            legend={[
              { label: "McDavid", color: "var(--c-mcdavid)" },
              { label: peerName, color: "var(--c-peer)" },
            ]}
            number={2}
            caption="Sample sizes vary sharply by context and are listed below; the deepest rounds carry the smallest samples. A missing bar is a context that player never reached."
          >
            <Plot
              build={build}
              height={360}
              ariaLabel={`Grouped bar chart comparing McDavid and ${peerName} ${metricLabel.toLowerCase()} per game. Values are listed in the table below.`}
            />
          </Figure>

          <DataTable
            caption="The values plotted above, with sample sizes."
            columns={[
              { key: "context", header: "Context" },
              { key: "mcd", header: "McDavid", numeric: true },
              { key: "nMcd", header: "n (McD)", numeric: true },
              { key: "peer", header: peerName, numeric: true },
              { key: "nPeer", header: `n (${peerName})`, numeric: true },
            ]}
            rows={idxs.map((i) => ({
              context: stats.labels[i],
              mcd: fmt(subject.means[metric][i]),
              nMcd: subject.counts[i],
              peer: fmt(peer.means[metric][i]),
              nPeer: peer.counts[i],
            }))}
          />

          {showDelta && (
            <>
              <h3>Regular season to Stanley Cup Finals</h3>
              <StatRow>
                <Stat
                  label="McDavid"
                  value={fmtSigned(subjectDrop)}
                  unit="pts/game"
                  accent
                />
                <Stat
                  label={peerName}
                  value={peerDrop === null ? "—" : fmtSigned(peerDrop)}
                  unit={peerDrop === null ? undefined : "pts/game"}
                  note={
                    peerDrop === null
                      ? "No Finals appearance in the window."
                      : `n=${peer.counts[scfIdx]} Finals games.`
                  }
                />
                <Stat
                  label="Ratio"
                  value={
                    peerDrop === null || subjectDrop === 0
                      ? "—"
                      : `${Math.abs(peerDrop / subjectDrop).toFixed(1)}×`
                  }
                  note={
                    peerDrop === null
                      ? "Undefined without a Finals sample."
                      : `${peerName}'s decline relative to McDavid's.`
                  }
                />
              </StatRow>
            </>
          )}
        </>
      )}
    </>
  );
}
