import Plot from "@/components/Plot";
import { Divider } from "@/components/ui";
import { signedBars, signedLayout } from "@/lib/charts";
import { model } from "@/lib/data";
import { FEATURE_PAGE_DISCLAIMER } from "@/lib/narrative";
import GameDecomposition from "./GameDecomposition";

export const metadata = { title: "Feature Contributions · Variance97" };

export default function FeatureContributionsPage() {
  // Plotly draws horizontal bars bottom-up, so sort ascending to match the
  // Streamlit version's ordering.
  const coefItems = [...model.coefficients]
    .sort((a, b) => a.coefficient - b.coefficient)
    .map((c) => ({ label: c.feature, value: c.coefficient }));

  return (
    <>
      <h1 className="page-title">Feature Contributions</h1>
      {FEATURE_PAGE_DISCLAIMER}

      <h2>Standardized coefficients (whole-model view)</h2>
      <p className="caption">
        Trained on {model.n_train} NHL games. Standardized features →
        coefficients are directly comparable in magnitude. Positive = increases
        predicted points, negative = decreases.
      </p>
      <Plot
        data={signedBars(coefItems)}
        layout={{
          ...signedLayout(
            "Coefficient (standardized features)",
            coefItems.map((c) => c.value),
          ),
        }}
        height={420}
        ariaLabel="Horizontal bar chart of standardized Ridge regression coefficients"
      />

      <p>
        <strong>The pattern:</strong> <code>game_number</code> is the strongest
        negative driver — McDavid&rsquo;s production cliff in late-series games
        is the model&rsquo;s clearest signal. <code>opp_ga_per_game</code>{" "}
        carries the modest positive effect that represents H3 (opponent
        defensive quality matters). And{" "}
        <strong>
          <code>game_context_stanley_cup_finals</code> is small
        </strong>{" "}
        once it has to compete against gameplay variables — the feature the
        original notebook treated as dominant has dissolved.
      </p>

      <Divider />

      <h2>Per-game decomposition</h2>
      <p>
        Pick a game to see which features pulled the model&rsquo;s prediction up
        and which pulled it down. The contributions sum (with the intercept) to
        the predicted points.
      </p>

      <GameDecomposition model={model} />

      <p className="caption">
        Why predicted ≠ actual most of the time: hockey games are noisy. The
        model earns its keep in the <em>aggregate signed direction</em> of
        features, not in sharply forecasting any individual game.
      </p>
    </>
  );
}
