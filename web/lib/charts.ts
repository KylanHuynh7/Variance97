/**
 * Chart theme + figure builders.
 *
 * Plotly can't read CSS custom properties, so `readChartTheme()` resolves the
 * palette off :root at render time and every builder takes the resolved theme.
 * Plot.tsx re-runs this when the color scheme changes, which is what makes dark
 * mode work.
 *
 * Palette provenance — validated with the data-viz validator against both
 * surfaces (light #fdfcfa, dark #17171a):
 *   McDavid vs MacKinnon   worst CVD ΔE 20.3 light / 14.0 dark   (>= 8 target)
 *   positive vs negative   worst CVD ΔE 21.6 light / 19.2 dark
 * Win/loss is deliberately NOT green-vs-red: that pair measures ΔE 4.1 under
 * deuteranopia, i.e. indistinguishable. Wins carry the series hue, losses go
 * neutral, and every bar is direct-labelled W/L so hue is never load-bearing.
 */

/** Below this container width a chart switches to its compact treatment:
 *  smaller tick text and roomier margins, so rotated category labels stay
 *  inside the figure instead of spilling past its right edge on a phone. */
export const COMPACT_WIDTH = 520;

export type ChartTheme = {
  mcdavid: string;
  mackinnon: string;
  positive: string;
  negative: string;
  neutralMark: string;
  grid: string;
  axis: string;
  ink: string;
  inkMuted: string;
  surface: string;
};

const FALLBACK: ChartTheme = {
  mcdavid: "#fc4c02",
  mackinnon: "#8e3050",
  positive: "#2a78d6",
  negative: "#e34948",
  neutralMark: "#a9a69c",
  grid: "#e3e1d9",
  axis: "#c9c6bb",
  ink: "#14130f",
  inkMuted: "#77756e",
  surface: "#fdfcfa",
};

const VAR_NAMES: Record<keyof ChartTheme, string> = {
  mcdavid: "--c-mcdavid",
  mackinnon: "--c-mackinnon",
  positive: "--c-positive",
  negative: "--c-negative",
  neutralMark: "--c-neutral-mark",
  grid: "--c-grid",
  axis: "--c-axis",
  ink: "--c-ink",
  inkMuted: "--c-ink-muted",
  surface: "--c-surface",
};

export function readChartTheme(): ChartTheme {
  if (typeof window === "undefined") return FALLBACK;
  const styles = getComputedStyle(document.documentElement);
  const out = {} as ChartTheme;
  for (const key of Object.keys(VAR_NAMES) as (keyof ChartTheme)[]) {
    out[key] = styles.getPropertyValue(VAR_NAMES[key]).trim() || FALLBACK[key];
  }
  return out;
}

const FONT_STACK =
  'var(--font-sans), system-ui, -apple-system, "Segoe UI", sans-serif';

/** Chrome shared by every figure: recessive hairline grid, no Plotly legend. */
export function baseLayout(t: ChartTheme, width = 640) {
  const compact = width < COMPACT_WIDTH;
  const tick = compact ? 10.5 : 12;
  return {
    font: { family: FONT_STACK, size: compact ? 11.5 : 12.5, color: t.inkMuted },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    showlegend: false,
    hoverlabel: {
      bgcolor: t.surface,
      bordercolor: t.axis,
      font: { family: FONT_STACK, size: 12.5, color: t.ink },
    },
    xaxis: {
      gridcolor: t.grid,
      linecolor: t.axis,
      zerolinecolor: t.axis,
      tickfont: { size: tick, color: t.inkMuted },
      // Deliberately no automargin: it grows the SVG past layout.height, which
      // pushes the axis band outside the figure's bordered box.
      automargin: false,
    },
    yaxis: {
      gridcolor: t.grid,
      linecolor: t.axis,
      zerolinecolor: t.axis,
      tickfont: { size: tick, color: t.inkMuted },
      automargin: true,
    },
  };
}

export const fmt = (v: number | null, digits = 2) =>
  v === null || Number.isNaN(v) ? "—" : v.toFixed(digits);

export const fmtSigned = (v: number | null, digits = 2) =>
  v === null || Number.isNaN(v)
    ? "—"
    : `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}`;

/* ------------------------------------------------------------------ */
/* Peer comparison — two categorical series                            */
/* ------------------------------------------------------------------ */

export function peerBars(
  t: ChartTheme,
  labels: string[],
  mcd: (number | null)[],
  mac: (number | null)[],
  metricLabel: string,
) {
  const series = (
    name: string,
    values: (number | null)[],
    color: string,
  ) => ({
    type: "bar",
    name,
    x: labels,
    y: values,
    marker: { color, line: { width: 0 } },
    hovertemplate: `<b>%{x}</b><br>${name}: %{y:.2f} ${metricLabel}<extra></extra>`,
  });

  return [
    series("McDavid", mcd, t.mcdavid),
    series("MacKinnon", mac, t.mackinnon),
  ];
}

export function peerLayout(t: ChartTheme, yTitle: string, width = 640) {
  const base = baseLayout(t, width);
  const compact = width < COMPACT_WIDTH;
  return {
    ...base,
    barmode: "group",
    bargap: 0.5,
    bargroupgap: 0.12,
    yaxis: {
      ...base.yaxis,
      title: { text: yTitle, font: { size: 12, color: t.inkMuted } },
      rangemode: "tozero",
    },
    xaxis: { ...base.xaxis, showgrid: false },
    margin: { t: 10, b: compact ? 74 : 58, l: compact ? 42 : 58, r: compact ? 30 : 14 },
  };
}

/* ------------------------------------------------------------------ */
/* Game-by-game — one measure, outcome as a secondary channel          */
/* ------------------------------------------------------------------ */

export type ResultGame = {
  date: string;
  opponent: string;
  points: number;
  result: string;
};

export function gameBars(t: ChartTheme, games: ResultGame[]) {
  const labels = games.map((g) => {
    const d = new Date(`${g.date}T00:00:00Z`);
    const md = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    return `${g.opponent}<br>${md} · ${g.result}`;
  });
  return [
    {
      type: "bar",
      x: labels,
      y: games.map((g) => g.points),
      marker: {
        color: games.map((g) =>
          g.result === "W" ? t.mcdavid : t.neutralMark,
        ),
        line: { width: 0 },
      },
      customdata: games.map((g) => (g.result === "W" ? "Win" : "Loss")),
      hovertemplate:
        "<b>%{x}</b><br>%{y} points · %{customdata}<extra></extra>",
    },
  ];
}

export function gameLayout(t: ChartTheme, width = 640) {
  const base = baseLayout(t, width);
  const compact = width < COMPACT_WIDTH;
  return {
    ...base,
    bargap: 0.6,
    yaxis: {
      ...base.yaxis,
      title: { text: "Points", font: { size: 12, color: t.inkMuted } },
      rangemode: "tozero",
      dtick: 1,
    },
    xaxis: { ...base.xaxis, showgrid: false },
    margin: { t: 10, b: compact ? 76 : 62, l: compact ? 40 : 52, r: compact ? 26 : 14 },
  };
}

/* ------------------------------------------------------------------ */
/* Playoff game number — single line, baseline reference               */
/* ------------------------------------------------------------------ */

export function gameNumberTrace(
  t: ChartTheme,
  points: { gameNumber: number; avg: number }[],
) {
  return [
    {
      type: "scatter",
      mode: "lines+markers",
      x: points.map((p) => p.gameNumber),
      y: points.map((p) => p.avg),
      line: { color: t.mcdavid, width: 2, shape: "linear" },
      marker: { size: 8, color: t.mcdavid, line: { width: 2, color: t.surface } },
      hovertemplate: "Game %{x}<br>%{y:.2f} points (avg)<extra></extra>",
    },
  ];
}

export function gameNumberLayout(
  t: ChartTheme,
  regularSeasonAvg: number,
  maxGame: number,
  width = 640,
) {
  const base = baseLayout(t, width);
  const compact = width < COMPACT_WIDTH;
  return {
    ...base,
    xaxis: {
      ...base.xaxis,
      title: { text: "Game number in series", font: { size: 12, color: t.inkMuted } },
      tickmode: "linear",
      tick0: 1,
      dtick: 1,
      range: [0.6, maxGame + 0.4],
      showgrid: false,
    },
    yaxis: {
      ...base.yaxis,
      title: { text: "Points per game", font: { size: 12, color: t.inkMuted } },
    },
    margin: { t: 26, b: 52, l: compact ? 44 : 58, r: compact ? 20 : 14 },
    shapes: [
      {
        type: "line",
        xref: "paper",
        x0: 0,
        x1: 1,
        y0: regularSeasonAvg,
        y1: regularSeasonAvg,
        line: { color: t.axis, width: 1 },
        layer: "below",
      },
    ],
    annotations: [
      {
        xref: "paper",
        x: 0,
        xanchor: "left",
        y: regularSeasonAvg,
        yanchor: "bottom",
        text: `Regular season · ${regularSeasonAvg.toFixed(2)}`,
        showarrow: false,
        font: { size: 11.5, color: t.inkMuted },
        yshift: 3,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Signed bars — diverging polarity (coefficients, contributions)      */
/* ------------------------------------------------------------------ */

export type SignedItem = { label: string; value: number };

export function signedBars(t: ChartTheme, items: SignedItem[], unit: string) {
  return [
    {
      type: "bar",
      orientation: "h",
      x: items.map((i) => i.value),
      y: items.map((i) => i.label),
      marker: {
        color: items.map((i) => (i.value >= 0 ? t.positive : t.negative)),
        line: { width: 0 },
      },
      hovertemplate: `%{y}<br>%{x:+.3f} ${unit}<extra></extra>`,
    },
  ];
}

export function signedLayout(
  t: ChartTheme,
  xTitle: string,
  values: number[],
  width = 640,
) {
  const base = baseLayout(t, width);
  const compact = width < COMPACT_WIDTH;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const pad = (max - min) * 0.12 || 1;
  return {
    ...base,
    bargap: 0.45,
    xaxis: {
      ...base.xaxis,
      // The long feature names push the plot area right, so on a phone the
      // centred axis title runs off the figure. The caption carries it there.
      title: compact
        ? undefined
        : { text: xTitle, font: { size: 12, color: t.inkMuted } },
      range: [min - pad, max + pad],
      zeroline: true,
      zerolinewidth: 1,
    },
    yaxis: {
      ...base.yaxis,
      showgrid: false,
      tickfont: { size: width < COMPACT_WIDTH ? 9.5 : 12, color: t.ink },
    },
    margin: { t: 10, b: compact ? 34 : 52, l: 10, r: compact ? 30 : 22 },
  };
}
