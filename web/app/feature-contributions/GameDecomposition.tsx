"use client";

import { useCallback, useMemo, useState } from "react";
import Plot from "@/components/Plot";
import { Figure, Stat, StatRow } from "@/components/ui";
import { ChartTheme, signedBars, signedLayout } from "@/lib/charts";
import { Model, contextLabel, perGameContributions } from "@/lib/data";

export default function GameDecomposition({ model }: { model: Model }) {
  const [idx, setIdx] = useState(model.games.length - 1); // most recent game

  const labels = useMemo(
    () =>
      model.games.map(
        (g) =>
          `${g.date} · ${g.opponent} · ${contextLabel(g.game_context)} · ${g.points} pts`,
      ),
    [model],
  );

  const decomp = useMemo(() => perGameContributions(model, idx), [model, idx]);

  const items = useMemo(
    () =>
      [...decomp.contributions]
        .map((c) => ({ label: c.feature, value: c.value }))
        .sort((a, b) => Math.abs(a.value) - Math.abs(b.value)),
    [decomp],
  );

  const build = useCallback(
    (t: ChartTheme) => ({
      data: signedBars(t, items, "pts"),
      layout: signedLayout(t, "Contribution to predicted points", items.map((i) => i.value)),
    }),
    [items],
  );

  const game = model.games[idx];

  return (
    <>
      <div className="controls">
        <label className="control" style={{ flex: "1 1 24rem", minWidth: 0 }}>
          <span className="control-label">Game</span>
          <select value={idx} onChange={(e) => setIdx(Number(e.target.value))}>
            {labels.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Figure
        title={`${game.date} · versus ${game.opponent}`}
        subtitle="Each feature's signed push on the model's prediction for this game."
        legend={[
          { label: "Raises the prediction", color: "var(--c-positive)" },
          { label: "Lowers it", color: "var(--c-negative)" },
        ]}
        number={2}
        caption={
          <>
            Contributions sum with the intercept to the predicted value. Reading
            one game this way shows the mechanism, not a forecast.
          </>
        }
      >
        <Plot
          build={build}
          height={400}
          ariaLabel="Horizontal bar chart of each feature's contribution to the predicted points for the selected game."
        />
      </Figure>

      <StatRow>
        <Stat
          label="Intercept"
          value={model.intercept.toFixed(2)}
          note="The training mean — where every prediction starts."
        />
        <Stat label="Predicted" value={decomp.predicted.toFixed(2)} unit="pts" />
        <Stat label="Actual" value={decomp.actual} unit="pts" accent />
      </StatRow>

      <p className="figure-sub">
        Predicted rarely equals actual, and that is the honest result: hockey
        games are noisy, and this model earns its keep in the aggregate signed
        direction of its features rather than in any single night.
      </p>
    </>
  );
}
