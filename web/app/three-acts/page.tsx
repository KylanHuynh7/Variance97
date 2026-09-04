import Plot from "@/components/Plot";
import Tabs from "@/components/Tabs";
import { Callout, Metric, MetricRow, Table } from "@/components/ui";
import {
  fmt,
  fmtSigned,
  gameNumberLayout,
  gameNumberTrace,
  pointsByGameBars,
  pointsByGameLayout,
} from "@/lib/charts";
import {
  Game,
  NHL_CONTEXT_ORDER,
  PLAYOFF_CONTEXTS,
  contextLabel,
  mcdavid,
  mean,
} from "@/lib/data";

export const metadata = { title: "Three Acts · Variance97" };

const GAME_COLUMNS = [
  { key: "date", header: "Date" },
  { key: "opponent", header: "Opponent" },
  { key: "game_context", header: "Context" },
  { key: "points", header: "Points", numeric: true },
  { key: "plus_minus", header: "+/−", numeric: true },
  { key: "result", header: "Result" },
  { key: "team_score", header: "Team", numeric: true },
  { key: "opp_score", header: "Opp", numeric: true },
];

const gameRows = (games: Game[]) =>
  games.map((g) => ({
    date: g.date,
    opponent: g.opponent,
    game_context: contextLabel(g.game_context),
    points: g.points,
    plus_minus: g.plus_minus,
    result: g.result,
    team_score: g.team_score,
    opp_score: g.opp_score,
  }));

export default function ThreeActsPage() {
  const rsPts = mean(
    mcdavid.filter((g) => g.game_context === "regular_season").map((g) => g.points),
  );

  // ---- Act 1: NHL ----
  const byContext = NHL_CONTEXT_ORDER.map((ctx) => {
    const rows = mcdavid.filter((g) => g.game_context === ctx);
    return {
      ctx,
      points: mean(rows.map((g) => g.points)),
      n: rows.length,
    };
  });

  const playoffs = mcdavid.filter((g) =>
    PLAYOFF_CONTEXTS.includes(g.game_context),
  );
  const gameNumbers = Array.from(
    new Set(playoffs.map((g) => g.game_number).filter((n): n is number => n !== null)),
  ).sort((a, b) => a - b);
  const byGameNumber = gameNumbers.map((n) => ({
    gameNumber: n,
    avg: mean(playoffs.filter((g) => g.game_number === n).map((g) => g.points)),
  }));

  const nhlOnly = mcdavid.filter((g) => NHL_CONTEXT_ORDER.includes(g.game_context));
  const elim = nhlOnly.filter((g) => g.is_elimination_game);
  const elimWins = elim.filter((g) => g.result === "W");
  const elimLosses = elim.filter((g) => g.result === "L");

  // ---- Act 2: Four Nations ----
  const fnf = mcdavid.filter((g) =>
    g.game_context.toLowerCase().includes("four_nations"),
  );
  const fnfPts = mean(fnf.map((g) => g.points));

  // ---- Act 3: Olympics ----
  const oly = mcdavid.filter((g) =>
    g.game_context.toLowerCase().includes("olympic"),
  );
  const olyCompetitive = oly.filter(
    (g) => !g.game_context.toLowerCase().includes("exhibition"),
  );
  const olyTotal = oly.reduce((s, g) => s + g.points, 0);

  const act1 = (
    <>
      <h2>McDavid in the NHL Playoffs</h2>
      <MetricRow>
        {byContext.map(({ ctx, points, n }) => (
          <Metric
            key={ctx}
            label={contextLabel(ctx)}
            value={`${fmt(points)} pts`}
            delta={
              ctx === "regular_season"
                ? `n=${n}`
                : `${fmtSigned(points - rsPts)} vs RS`
            }
          />
        ))}
      </MetricRow>

      <h3>Late-series production cliff</h3>
      <p>
        Phase 1&rsquo;s most-replicated NHL finding: McDavid&rsquo;s points hold
        up through Game 5 and then fall sharply.
      </p>
      <Plot
        data={gameNumberTrace(byGameNumber)}
        layout={gameNumberLayout(rsPts, gameNumbers[gameNumbers.length - 1])}
        height={350}
        ariaLabel="Line chart of McDavid's average points by playoff game number, with the regular-season average as a dashed baseline"
      />

      <h3>Elimination games — wins vs losses</h3>
      <MetricRow>
        <Metric label="Regular season avg" value={`${fmt(rsPts)} pts/game`} />
        <Metric
          label={`Elimination wins (n=${elimWins.length})`}
          value={
            elimWins.length
              ? `${fmt(mean(elimWins.map((g) => g.points)))} pts/game`
              : "—"
          }
        />
        <Metric
          label={`Elimination losses (n=${elimLosses.length})`}
          value={
            elimLosses.length
              ? `${fmt(mean(elimLosses.map((g) => g.points)))} pts/game`
              : "—"
          }
        />
      </MetricRow>
      <p className="caption">
        McDavid&rsquo;s average points are actually <em>higher</em> in
        elimination games than non-elimination games — driven by the wins. The
        split is what Phase 2 Test 2 picked up: large effect size on losses,
        small sample.
      </p>
    </>
  );

  const act2 = (
    <>
      <h2>McDavid at the 2025 Four Nations Face-Off</h2>
      <p>
        Canada won the tournament. McDavid scored the OT winner in the gold
        medal game vs the United States. The only loss was the group-stage game
        against the US (with Hellebuyck in net).
      </p>
      <Plot
        data={pointsByGameBars(fnf)}
        layout={pointsByGameLayout("Four Nations — McDavid game-by-game")}
        height={380}
        ariaLabel="Bar chart of McDavid's points in each Four Nations game, colored by win or loss"
      />
      <Table columns={GAME_COLUMNS} rows={gameRows(fnf)} />
      <MetricRow>
        <Metric
          label="FNF avg"
          value={`${fmt(fnfPts)} pts/game`}
          delta={`${fmtSigned(fnfPts - rsPts)} vs RS`}
        />
        <Metric label="Tournament outcome" value="🥇 Gold" />
      </MetricRow>
    </>
  );

  const act3 = (
    <>
      <h2>McDavid at the 2026 Milan Cortina Olympics</h2>
      <p>
        McDavid set the <strong>Olympic scoring record</strong> with 13 points in
        6 games. Then came the gold medal game against the United States —
        Connor Hellebuyck in net, Canada lost 1&ndash;2 in OT, McDavid was held
        pointless.
      </p>
      <Plot
        data={pointsByGameBars(olyCompetitive)}
        layout={pointsByGameLayout(
          "Olympics — competitive games (group + knockouts)",
        )}
        height={380}
        ariaLabel="Bar chart of McDavid's points in each competitive Olympic game, colored by win or loss"
      />
      <Table columns={GAME_COLUMNS} rows={gameRows(oly)} />
      <MetricRow>
        <Metric label="Olympic points (total)" value={olyTotal} />
        <Metric label="Gold medal game" value="0 pts, −2" delta="vs Hellebuyck" />
        <Metric label="Tournament outcome" value="🥈 Silver" />
      </MetricRow>
      <Callout kind="warning">
        <p>
          The pattern across both international tournaments is the same:
          McDavid&rsquo;s only pointless games come against the United States
          with Hellebuyck in net. n=3 — see Limitations.
        </p>
      </Callout>
    </>
  );

  return (
    <>
      <h1 className="page-title">Three Acts</h1>
      <p className="caption">
        How McDavid&rsquo;s production moves across three high-stakes contexts:
        the NHL Stanley Cup Playoffs, the 2025 Four Nations Face-Off, and the
        2026 Winter Olympics.
      </p>
      <Tabs
        labels={[
          "Act 1 — Stanley Cup Playoffs",
          "Act 2 — Four Nations Face-Off",
          "Act 3 — 2026 Winter Olympics",
        ]}
        panels={[act1, act2, act3]}
      />
    </>
  );
}
