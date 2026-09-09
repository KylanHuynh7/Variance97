"use client";

import { useCallback, useState } from "react";
import Plot from "@/components/Plot";
import { Callout, DataTable, Figure, Stat, StatRow } from "@/components/ui";
import { ChartTheme, fmt, fmtSigned, peerBars, peerLayout } from "@/lib/charts";

export type PeerStats = {
  contexts: string[];
  labels: string[];
  /** Same categories, wrapped over two lines for the chart axis. */
  chartLabels: string[];
  counts: { mcdavid: number[]; mackinnon: number[] };
  /** metric -> per-context means, aligned with `contexts`. */
  means: Record<
    string,
    { mcdavid: (number | null)[]; mackinnon: (number | null)[] }
  >;
};

const METRICS = [
  { key: "points", label: "Points" },
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "plus_minus", label: "Plus / minus" },
];

export default function PeerExplorer({ stats }: { stats: PeerStats }) {
  const [selected, setSelected] = useState<string[]>(stats.contexts);
  const [metric, setMetric] = useState("points");

  const toggle = (ctx: string) =>
    setSelected((prev) =>
      prev.includes(ctx) ? prev.filter((c) => c !== ctx) : [...prev, ctx],
    );

  // Canonical context order regardless of click order — and, because color
  // follows the player rather than the row, filtering never repaints a series.
  const idxs = stats.contexts
    .map((c, i) => (selected.includes(c) ? i : -1))
    .filter((i) => i >= 0);

  const labels = idxs.map((i) => stats.labels[i]);
  const chartLabels = idxs.map((i) => stats.chartLabels[i]);
  const mcd = idxs.map((i) => stats.means[metric].mcdavid[i]);
  const mac = idxs.map((i) => stats.means[metric].mackinnon[i]);
  const metricLabel = METRICS.find((m) => m.key === metric)!.label;

  const build = useCallback(
    (t: ChartTheme, w: number) => ({
      data: peerBars(t, chartLabels, mcd, mac, "per game"),
      layout: peerLayout(t, `${metricLabel} per game`, w),
    }),
    [chartLabels, mcd, mac, metricLabel],
  );

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
    macDrop =
      stats.means.points.mackinnon[scf]! - stats.means.points.mackinnon[rs]!;
  }

  return (
    <>
      <div className="controls">
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
      </div>

      {selected.length === 0 ? (
        <Callout kind="warn">
          <p>Select at least one context to draw the comparison.</p>
        </Callout>
      ) : (
        <>
          <Figure
            title={`${metricLabel} per game, McDavid vs MacKinnon`}
            subtitle="Same era, similar usage, both in the playoffs every year of the window."
            legend={[
              { label: "McDavid", color: "var(--c-mcdavid)" },
              { label: "MacKinnon", color: "var(--c-mackinnon)" },
            ]}
            number={1}
            caption="Sample sizes vary sharply by context and are listed below; the deepest rounds carry the smallest samples."
          >
            <Plot
              build={build}
              height={360}
              ariaLabel={`Grouped bar chart comparing McDavid and MacKinnon ${metricLabel.toLowerCase()} per game. Values are listed in the table below.`}
            />
          </Figure>

          <DataTable
            caption="The values plotted above, with sample sizes."
            columns={[
              { key: "context", header: "Context" },
              { key: "mcd", header: "McDavid", numeric: true },
              { key: "nMcd", header: "n (McD)", numeric: true },
              { key: "mac", header: "MacKinnon", numeric: true },
              { key: "nMac", header: "n (Mac)", numeric: true },
            ]}
            rows={idxs.map((i) => ({
              context: stats.labels[i],
              mcd: fmt(stats.means[metric].mcdavid[i]),
              nMcd: stats.counts.mcdavid[i],
              mac: fmt(stats.means[metric].mackinnon[i]),
              nMac: stats.counts.mackinnon[i],
            }))}
          />

          {showDelta && (
            <>
              <h2>Regular season to Stanley Cup Finals</h2>
              <StatRow>
                <Stat
                  label="McDavid"
                  value={fmtSigned(mcdDrop)}
                  unit="pts/game"
                  accent
                />
                <Stat
                  label="MacKinnon"
                  value={fmtSigned(macDrop)}
                  unit="pts/game"
                />
                <Stat
                  label="Ratio"
                  value={`${Math.abs(macDrop / mcdDrop).toFixed(1)}×`}
                  note="MacKinnon's decline relative to McDavid's."
                />
              </StatRow>
              <Callout kind="key" label="The headline finding">
                <p>
                  McDavid&rsquo;s individual Stanley Cup Finals decline is{" "}
                  <em>smaller</em> than a directly comparable peer&rsquo;s — and
                  that peer won the Cup. The popular{" "}
                  <em>&ldquo;can&rsquo;t perform on the big stage&rdquo;</em>{" "}
                  thesis does not survive contact with peer data.
                </p>
              </Callout>
            </>
          )}
        </>
      )}
    </>
  );
}
