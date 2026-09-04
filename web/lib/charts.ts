/**
 * Shared chart palette and figure builders.
 * Ported from app/components/charts.py so the two apps render identically.
 */
export const COLOR_MCDAVID = "#FC4C02"; // Oilers orange (and project accent)
export const COLOR_MACKINNON = "#6F263D"; // Avalanche burgundy
export const COLOR_BASELINE = "#7F7F7F";
export const COLOR_WIN = "#2EA84F";
export const COLOR_LOSS = "#C8102E";
export const COLOR_NEGATIVE = "#1F77B4";

export const fmt = (v: number | null, digits = 2) =>
  v === null || Number.isNaN(v) ? "—" : v.toFixed(digits);

export const fmtSigned = (v: number | null, digits = 2) =>
  v === null || Number.isNaN(v)
    ? "—"
    : `${v >= 0 ? "+" : ""}${v.toFixed(digits)}`;

/** Grouped bar: McDavid vs MacKinnon across contexts. */
export function peerBars(
  labels: string[],
  mcd: (number | null)[],
  mac: (number | null)[],
) {
  return [
    {
      type: "bar",
      x: labels,
      y: mcd,
      name: "McDavid",
      marker: { color: COLOR_MCDAVID },
      text: mcd.map((v) => (v === null ? "" : v.toFixed(2))),
      textposition: "outside",
    },
    {
      type: "bar",
      x: labels,
      y: mac,
      name: "MacKinnon",
      marker: { color: COLOR_MACKINNON },
      text: mac.map((v) => (v === null ? "" : v.toFixed(2))),
      textposition: "outside",
    },
  ];
}

export function peerLayout(yTitle: string) {
  return {
    barmode: "group",
    yaxis: { title: { text: yTitle } },
    xaxis: { title: { text: "" } },
    legend: { orientation: "h", yanchor: "bottom", y: 1.02, x: 0 },
    margin: { t: 40, b: 40, l: 50, r: 20 },
  };
}

/** Horizontal signed-value bar chart (coefficients, contributions). */
export function signedBars(
  items: { label: string; value: number }[],
  digits = 3,
) {
  return [
    {
      type: "bar",
      orientation: "h",
      x: items.map((i) => i.value),
      y: items.map((i) => i.label),
      marker: {
        color: items.map((i) =>
          i.value >= 0 ? COLOR_MCDAVID : COLOR_NEGATIVE,
        ),
      },
      text: items.map(
        (i) => `${i.value >= 0 ? "+" : ""}${i.value.toFixed(digits)}`,
      ),
      textposition: "outside",
      // Outside labels on the leftmost negative bar get cut off at the axis
      // without this.
      cliponaxis: false,
      hovertemplate: "%{y}<br>%{x:.3f}<extra></extra>",
    },
  ];
}

/**
 * `values` is used to pad the x-range: outside-positioned labels on the
 * outermost bars are drawn past the bar end, and without headroom they
 * collide with the y-axis tick labels.
 */
export function signedLayout(xTitle: string, values: number[]) {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const pad = (max - min) * 0.18 || 1;
  return {
    xaxis: {
      title: { text: xTitle },
      zeroline: true,
      zerolinecolor: "#888",
      range: [min - pad, max + pad],
    },
    yaxis: { title: { text: "" }, automargin: true },
    margin: { t: 20, b: 40, l: 20, r: 30 },
    showlegend: false,
  };
}

/** Per-game points bars colored by W/L. Mirrors charts.py::points_by_game. */
export function pointsByGameBars(
  games: { date: string; opponent: string; points: number; result: string }[],
) {
  const labels = games.map((g) => {
    const d = new Date(`${g.date}T00:00:00`);
    const md = d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      timeZone: "UTC",
    });
    return `${md}<br>${g.opponent}`;
  });
  return [
    {
      type: "bar",
      x: labels,
      y: games.map((g) => g.points),
      marker: {
        color: games.map((g) => (g.result === "W" ? COLOR_WIN : COLOR_LOSS)),
      },
      text: games.map((g) => String(g.points)),
      textposition: "outside",
      hovertemplate: "%{x}<br>Points: %{y}<extra></extra>",
    },
  ];
}

export function pointsByGameLayout(title: string) {
  return {
    title: { text: title },
    yaxis: { title: { text: "Points" } },
    xaxis: { title: { text: "" } },
    margin: { t: 50, b: 70, l: 50, r: 20 },
    showlegend: false,
  };
}

/**
 * Average points by playoff game number, with the regular-season baseline as a
 * dashed line and games 6–7 shaded. Mirrors charts.py::points_by_game_number.
 */
export function gameNumberTrace(
  points: { gameNumber: number; avg: number }[],
) {
  return [
    {
      type: "scatter",
      mode: "lines+markers",
      x: points.map((p) => p.gameNumber),
      y: points.map((p) => p.avg),
      line: { color: COLOR_MCDAVID, width: 3 },
      marker: { size: 10 },
      name: "Avg points",
      hovertemplate: "Game %{x}<br>Avg: %{y:.2f}<extra></extra>",
    },
  ];
}

export function gameNumberLayout(regularSeasonAvg: number, maxGame: number) {
  return {
    xaxis: {
      tickmode: "linear",
      tick0: 1,
      dtick: 1,
      title: { text: "Playoff game number" },
      range: [0.5, maxGame + 0.5],
    },
    yaxis: { title: { text: "McDavid points (avg)" } },
    margin: { t: 20, b: 50, l: 50, r: 20 },
    showlegend: false,
    shapes: [
      {
        type: "line",
        xref: "paper",
        x0: 0,
        x1: 1,
        y0: regularSeasonAvg,
        y1: regularSeasonAvg,
        line: { color: COLOR_BASELINE, dash: "dash", width: 2 },
      },
      {
        type: "rect",
        xref: "x",
        yref: "paper",
        x0: 5.5,
        x1: 7.5,
        y0: 0,
        y1: 1,
        fillcolor: "red",
        opacity: 0.05,
        line: { width: 0 },
      },
    ],
    annotations: [
      {
        xref: "paper",
        x: 1,
        y: regularSeasonAvg,
        xanchor: "right",
        yanchor: "bottom",
        text: `Regular season avg (${regularSeasonAvg.toFixed(2)})`,
        showarrow: false,
        font: { color: COLOR_BASELINE, size: 12 },
      },
      {
        xref: "x",
        x: 5.6,
        yref: "paper",
        y: 1,
        xanchor: "left",
        yanchor: "top",
        text: "Late series",
        showarrow: false,
        font: { size: 12, color: COLOR_BASELINE },
      },
    ],
  };
}
