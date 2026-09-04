"use client";

import { useState } from "react";
import Plot from "@/components/Plot";
import { Callout, Metric, MetricRow, Table } from "@/components/ui";
import { fmtSigned, peerBars, peerLayout } from "@/lib/charts";

export type PeerStats = {
  contexts: string[];
  labels: string[];
  counts: { mcdavid: number[]; mackinnon: number[] };
  /** metric -> per-context means, aligned with `contexts`. */
  means: Record<string, { mcdavid: (number | null)[]; mackinnon: (number | null)[] }>;
};

const METRICS = [
  { key: "points", label: "Points" },
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "plus_minus", label: "Plus Minus" },
];

export default function PeerExplorer({ stats }: { stats: PeerStats }) {
  const [selected, setSelected] = useState<string[]>(stats.contexts);
  const [metric, setMetric] = useState("points");

  const toggle = (ctx: string) =>
    setSelected((prev) =>
      prev.includes(ctx) ? prev.filter((c) => c !== ctx) : [...prev, ctx],
    );

  // Keep the canonical context order regardless of click order.
  const idxs = stats.contexts
    .map((c, i) => (selected.includes(c) ? i : -1))
    .filter((i) => i >= 0);

  const labels = idxs.map((i) => stats.labels[i]);
  const mcd = idxs.map((i) => stats.means[metric].mcdavid[i]);
  const mac = idxs.map((i) => stats.means[metric].mackinnon[i]);

  const metricLabel = METRICS.find((m) => m.key === metric)!.label;

  const showDelta =
    metric === "points" &&
    selected.includes("regular_season") &&
    selected.includes("stanley_cup_finals");

  let mcdDrop = 0;
  let macDrop = 0;
  if (showDelta) {
    const rs = stats.contexts.indexOf("regular_season");
    const scf = stats.contexts.indexOf("stanley_cup_finals");
    mcdDrop = stats.means.points.mcdavid[scf]! - stats.means.points.mcdavid[rs]!;
    macDrop = stats.means.points.mackinnon[scf]! - stats.means.points.mackinnon[rs]!;
  }

  return (
    <>
      <div className="controls">
        <div className="control">
          <span>Contexts to compare</span>
          <div className="chips">
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
        <label className="control">
          <span>Metric</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selected.length === 0 ? (
        <Callout kind="warning">
          <p>Select at least one context.</p>
        </Callout>
      ) : (
        <>
          <Plot
            data={peerBars(labels, mcd, mac)}
            layout={peerLayout(`${metricLabel} per game`)}
            height={420}
            ariaLabel={`Grouped bar chart comparing McDavid and MacKinnon ${metricLabel.toLowerCase()} per game`}
          />

          <h2>Sample sizes</h2>
          <Table
            columns={[
              { key: "context", header: "Context" },
              { key: "mcd", header: "McDavid (n)", numeric: true },
              { key: "mac", header: "MacKinnon (n)", numeric: true },
            ]}
            rows={idxs.map((i) => ({
              context: stats.labels[i],
              mcd: stats.counts.mcdavid[i],
              mac: stats.counts.mackinnon[i],
            }))}
          />

          {showDelta && (
            <>
              <h2>Regular season → Stanley Cup Finals delta</h2>
              <MetricRow>
                <Metric label="McDavid" value={`${fmtSigned(mcdDrop)} pts/game`} />
                <Metric label="MacKinnon" value={`${fmtSigned(macDrop)} pts/game`} />
                <Metric
                  label="Ratio (Mac / McD)"
                  value={`${Math.abs(macDrop / mcdDrop).toFixed(1)}×`}
                />
              </MetricRow>
              <Callout kind="success">
                <p>
                  <strong>The headline finding.</strong> McDavid&rsquo;s
                  individual Stanley Cup Finals decline is <em>smaller</em> than
                  a directly comparable peer&rsquo;s — and the peer won the Cup.
                  The popular <em>&ldquo;can&rsquo;t perform on the big
                  stage&rdquo;</em> thesis doesn&rsquo;t survive contact with
                  peer data.
                </p>
              </Callout>
            </>
          )}
        </>
      )}
    </>
  );
}
