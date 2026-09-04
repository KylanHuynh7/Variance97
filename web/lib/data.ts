/**
 * Typed access to the build-time data bundle.
 *
 * `public/data.json` is written by `data/build/export_web.py` from the same
 * clean CSVs the Streamlit app reads. Everything here runs in server
 * components at build time, so pages ship only the small derived numbers they
 * actually render — not the whole bundle.
 */
import bundle from "@/public/data.json";

export type Game = {
  date: string;
  opponent: string;
  goals: number;
  assists: number;
  points: number;
  plus_minus: number;
  SOG: number | null;
  TOI: number | null;
  result: string;
  team_score: number;
  opp_score: number;
  game_number: number | null;
  game_context: string;
  season: string;
  is_elimination_game: boolean;
  rest_days: number | null;
  is_back_to_back: boolean;
  rolling_pts_5: number | null;
  opp_ga_per_game: number | null;
};

export type ModelGame = {
  date: string;
  opponent: string;
  game_context: string;
  points: number;
  x: number[];
};

export type Model = {
  feature_names: string[];
  intercept: number;
  scaler_mean: number[];
  scaler_scale: number[];
  coefficients: { feature: string; coefficient: number }[];
  n_train: number;
  games: ModelGame[];
};

export type PipelineInfo = {
  files: { label: string; path: string; last_refreshed: string; size_kb: number }[];
  total_games: number;
  latest_game: string;
  seasons: number;
  per_season: { season: string; game_context: string; games: number }[];
};

export const mcdavid = bundle.mcdavid as Game[];
export const mackinnon = bundle.mackinnon as Game[];
export const model = bundle.model as Model;
export const pipeline = bundle.pipeline as PipelineInfo;
export const generatedAt = bundle.generated_at as string;

export const NHL_CONTEXT_ORDER = [
  "regular_season",
  "first_round",
  "second_round",
  "conf_finals",
  "stanley_cup_finals",
];

export const PLAYOFF_CONTEXTS = [
  "first_round",
  "second_round",
  "conf_finals",
  "stanley_cup_finals",
];

/** Pretty-print a game_context value. Mirrors data_loader.context_label. */
export function contextLabel(ctx: string): string {
  return ctx
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type NumericGameKey = "points" | "goals" | "assists" | "plus_minus";

/** Mean of `key` over games in each context. `null` where a context has no games. */
export function meanByContext(
  games: Game[],
  contexts: string[],
  key: NumericGameKey = "points",
): (number | null)[] {
  return contexts.map((ctx) => {
    const rows = games.filter((g) => g.game_context === ctx);
    if (rows.length === 0) return null;
    return rows.reduce((s, g) => s + g[key], 0) / rows.length;
  });
}

export function countByContext(games: Game[], contexts: string[]): number[] {
  return contexts.map(
    (ctx) => games.filter((g) => g.game_context === ctx).length,
  );
}

export function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function contextMean(
  games: Game[],
  ctx: string,
  key: NumericGameKey = "points",
): number {
  return mean(games.filter((g) => g.game_context === ctx).map((g) => g[key]));
}

/**
 * Per-feature contributions for one game of the Ridge model.
 *
 *   pred = intercept + sum_i coef_i * (x_i - mean_i) / scale_i
 *
 * Each term is that feature's contribution. Same decomposition as
 * app/components/model.py::per_game_contributions, just done in the browser
 * from the exported scaler and coefficients.
 */
export function perGameContributions(m: Model, rowIdx: number) {
  const coefByName = new Map(
    m.coefficients.map((c) => [c.feature, c.coefficient]),
  );
  const row = m.games[rowIdx];
  const contributions = m.feature_names.map((name, i) => ({
    feature: name,
    value:
      ((row.x[i] - m.scaler_mean[i]) / m.scaler_scale[i]) *
      (coefByName.get(name) ?? 0),
  }));
  const predicted =
    m.intercept + contributions.reduce((s, c) => s + c.value, 0);
  return { contributions, predicted, actual: row.points, row };
}
