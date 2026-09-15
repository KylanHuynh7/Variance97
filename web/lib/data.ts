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
  /** Opposing starter. `null` for international games, which have no boxscore. */
  opp_goalie_name: string | null;
  /** His save% over the prior 365 days, shrunk toward league rate. */
  opp_goalie_sv_pct: number | null;
};

export type ModelGame = {
  date: string;
  opponent: string;
  opp_goalie_name: string | null;
  game_context: string;
  points: number;
  x: number[];
};

export type Model = {
  feature_names: string[];
  /** The dropped dummy category every game_context_* coefficient is measured against. */
  reference_context: string;
  intercept: number;
  scaler_mean: number[];
  scaler_scale: number[];
  coefficients: { feature: string; coefficient: number }[];
  n_train: number;
  games: ModelGame[];
};

/**
 * Per-context aggregates for one player in the peer group.
 *
 * Aggregates rather than a game log: the peer page compares means, counts and
 * Finals series, and six full logs would multiply the bundle to ship numbers
 * no page reads game-by-game. The subject's own log is exported in full
 * separately, for the pages that do.
 */
export type PlayerSummary = {
  key: string;
  name: string;
  short_name: string;
  role: "subject" | "peer";
  /** Why this player is in the registry, and what caveat they carry. */
  note: string;
  /** Games per context, aligned with `contexts`. */
  counts: number[];
  /** metric -> per-context means, aligned with `contexts`. */
  means: Record<string, (number | null)[]>;
  /**
   * Regular season to Stanley Cup Finals, in points per game. `null` for a
   * player with no Finals appearance in the window — a fact about the peer
   * group, not a missing value.
   */
  scf_drop: number | null;
  scf_games: number;
  scf_series: {
    season: string;
    opponent: string;
    games: number;
    points_per_game: number;
    record: string;
    won: boolean;
  }[];
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
export const players = bundle.players as PlayerSummary[];
export const contexts = bundle.contexts as string[];

export const subject = players.find((p) => p.role === "subject")!;
export const peers = players.filter((p) => p.role === "peer");

/** Peers with a Finals appearance in the window, steepest decline last. */
export const peersWithFinals = peers
  .filter((p) => p.scf_drop !== null)
  .sort((a, b) => b.scf_drop! - a.scf_drop!);

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

/**
 * Category label for a chart axis, broken over two lines.
 *
 * Plotly rotates tick labels when they don't fit, and rotated labels then get
 * clipped because the figure box can't grow to absorb them (Plotly positions
 * its SVG absolutely). Wrapping keeps them horizontal at every width.
 */
export function chartContextLabel(ctx: string): string {
  const wrapped: Record<string, string> = {
    regular_season: "Regular<br>season",
    first_round: "First<br>round",
    second_round: "Second<br>round",
    conf_finals: "Conference<br>finals",
    stanley_cup_finals: "Stanley Cup<br>finals",
  };
  return wrapped[ctx] ?? contextLabel(ctx);
}

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

/** NaN on an empty list, which `fmt` renders as an em dash rather than "NaN". */
export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
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
