"use client";

import { useMemo, useState } from "react";
import Plot from "@/components/Plot";
import { Metric, MetricRow } from "@/components/ui";
import { signedBars, signedLayout } from "@/lib/charts";
import { Model, contextLabel, perGameContributions } from "@/lib/data";

export default function GameDecomposition({ model }: { model: Model }) {
  const [idx, setIdx] = useState(model.games.length - 1); // most recent game

  const labels = useMemo(
    () =>
      model.games.map(
        (g) =>
          `${g.date}  vs ${g.opponent}  · ${contextLabel(g.game_context)}  · actual ${g.points} pts`,
      ),
    [model],
  );

  const decomp = useMemo(() => perGameContributions(model, idx), [model, idx]);

  const items = [...decomp.contributions]
    .map((c) => ({ label: c.feature, value: c.value }))
    .sort((a, b) => Math.abs(a.value) - Math.abs(b.value));

  return (
    <>
      <label className="control">
        <span>Game</span>
        <select
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          style={{ minWidth: "min(100%, 34rem)" }}
        >
          {labels.map((label, i) => (
            <option key={i} value={i}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <Plot
        data={signedBars(items, 2)}
        layout={{
          ...signedLayout(
            "Contribution to predicted points",
            items.map((i) => i.value),
          ),
          title: {
            text: `Per-game feature contributions  (intercept = ${model.intercept.toFixed(2)}, actual = ${decomp.actual})`,
          },
          margin: { t: 50, b: 40, l: 20, r: 30 },
        }}
        height={420}
        ariaLabel="Horizontal bar chart of each feature's contribution to the predicted points for the selected game"
      />

      <MetricRow>
        <Metric
          label="Intercept (training mean)"
          value={model.intercept.toFixed(2)}
        />
        <Metric label="Predicted" value={decomp.predicted.toFixed(2)} />
        <Metric label="Actual" value={decomp.actual} />
      </MetricRow>
    </>
  );
}
