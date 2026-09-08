import { Callout, DataTable, Figure, PageHeader, Rule } from "@/components/ui";
import { model } from "@/lib/data";
import CoefficientFigure from "./CoefficientFigure";
import GameDecomposition from "./GameDecomposition";

export const metadata = { title: "The model" };

export default function FeatureContributionsPage() {
  // Plotly draws horizontal bars bottom-up, so ascending puts the largest
  // negative driver at the bottom of the axis.
  const coefItems = [...model.coefficients]
    .sort((a, b) => a.coefficient - b.coefficient)
    .map((c) => ({ label: c.feature, value: c.coefficient }));

  const ranked = [...model.coefficients].sort(
    (a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient),
  );

  return (
    <>
      <PageHeader
        kicker="The model"
        title="What dissolves under scrutiny"
        dek={
          <>
            The interesting result here isn&rsquo;t what ranks highest. It&rsquo;s
            what collapses once a &ldquo;championship&rdquo; label has to compete
            against how the game was actually played.
          </>
        }
      />

      <Callout kind="warn" label="Read this first">
        <p>
          This model performs at baseline — R&sup2; near zero on held-out games.
          It is <strong>not a deployable predictor</strong>, and nothing here
          forecasts tonight. Use it to see which features carry signed weight,
          and which don&rsquo;t.
        </p>
      </Callout>

      <p className="lede">
        The original notebook ran a logistic regression with only{" "}
        <code>game_context</code> to work with. &ldquo;Stanley Cup Finals&rdquo;
        dominated it, at +0.67. That looked like a finding.
      </p>

      <p>
        Then real gameplay features were allowed to compete —{" "}
        <code>opp_ga_per_game</code>, <code>game_number</code>,{" "}
        <code>rolling_pts_5</code>, <code>rest_days</code>. The Finals
        coefficient fell to roughly −0.07. The variance it had been holding
        rerouted to late-series fatigue and opponent defensive quality. The
        &ldquo;Finals effect&rdquo; was largely a late-series-against-good-defense
        effect wearing a context label.
      </p>

      <Figure
        title="Standardized coefficients"
        subtitle={`Ridge regression on points per game, trained on ${model.n_train} NHL games.`}
        legend={[
          { label: "Increases predicted points", color: "var(--c-positive)" },
          { label: "Decreases them", color: "var(--c-negative)" },
        ]}
        number={1}
        caption={
          <>
            Features are standardized, so coefficient magnitudes are directly
            comparable. <code>game_number</code> is the strongest single driver;{" "}
            <code>game_context_stanley_cup_finals</code> is not.
          </>
        }
      >
        <CoefficientFigure items={coefItems} />
      </Figure>

      <DataTable
        caption="Every coefficient, ordered by magnitude."
        columns={[
          { key: "feature", header: "Feature" },
          { key: "coef", header: "Coefficient", numeric: true },
        ]}
        rows={ranked.map((c) => ({
          feature: <code>{c.feature}</code>,
          coef: c.coefficient >= 0
            ? `+${c.coefficient.toFixed(3)}`
            : `−${Math.abs(c.coefficient).toFixed(3)}`,
        }))}
      />

      <p>
        <code>opp_ga_per_game</code> carries the modest positive effect standing
        in for H3 — opponent defensive quality moves the needle. And the feature
        the original framing treated as decisive has, on these features, very
        little left to say.
      </p>

      <Rule />

      <h2>One game at a time</h2>
      <p>
        The same arithmetic runs per game. Because the model is a Ridge fit on
        standardized features, a prediction decomposes exactly:{" "}
        <code>intercept + Σ coef × (x − mean) / scale</code>. Each term is one
        feature&rsquo;s contribution.
      </p>

      <GameDecomposition model={model} />
    </>
  );
}
