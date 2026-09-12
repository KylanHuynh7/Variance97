import { Fragment } from "react";
import Link from "next/link";
import Tabs from "@/components/Tabs";
import {
  Callout,
  DataTable,
  Figure,
  PageHeader,
  Stat,
  StatRow,
} from "@/components/ui";
import { fmt, fmtSigned } from "@/lib/charts";
import {
  Game,
  NHL_CONTEXT_ORDER,
  PLAYOFF_CONTEXTS,
  contextLabel,
  mcdavid,
  mean,
} from "@/lib/data";
import { GameByGameFigure, GameNumberFigure } from "./ActFigures";

export const metadata = { title: "Three Acts" };

const GAME_COLUMNS = [
  { key: "date", header: "Date" },
  { key: "opponent", header: "Opponent" },
  { key: "game_context", header: "Stage" },
  { key: "points", header: "Pts", numeric: true },
  { key: "plus_minus", header: "+/−", numeric: true },
  { key: "result", header: "Result" },
  { key: "score", header: "Score", numeric: true },
];

const gameRows = (games: Game[]) =>
  games.map((g) => ({
    date: g.date,
    opponent: g.opponent,
    game_context: contextLabel(g.game_context)
      .replace("Four Nations Faceoff ", "")
      .replace("Olympics ", ""),
    points: g.points,
    plus_minus: g.plus_minus > 0 ? `+${g.plus_minus}` : g.plus_minus,
    result: g.result,
    score: `${g.team_score}–${g.opp_score}`,
  }));

const RESULT_LEGEND = [
  { label: "Win", color: "var(--c-mcdavid)" },
  { label: "Loss", color: "var(--c-neutral-mark)" },
];

export default function ThreeActsPage() {
  const rsPts = mean(
    mcdavid
      .filter((g) => g.game_context === "regular_season")
      .map((g) => g.points),
  );

  // ---- Act I ----
  const byContext = NHL_CONTEXT_ORDER.map((ctx) => {
    const rows = mcdavid.filter((g) => g.game_context === ctx);
    return { ctx, points: mean(rows.map((g) => g.points)), n: rows.length };
  });

  const playoffs = mcdavid.filter((g) =>
    PLAYOFF_CONTEXTS.includes(g.game_context),
  );
  const gameNumbers = Array.from(
    new Set(
      playoffs.map((g) => g.game_number).filter((n): n is number => n !== null),
    ),
  ).sort((a, b) => a - b);
  const byGameNumber = gameNumbers.map((n) => ({
    gameNumber: n,
    avg: mean(playoffs.filter((g) => g.game_number === n).map((g) => g.points)),
    n: playoffs.filter((g) => g.game_number === n).length,
  }));

  // First round, split by season rather than pooled. Pooling is what hides
  // 2025-26: five series average out to a rate that looks like the regular
  // season, and the one series that doesn't disappears into the mean.
  const firstRoundSeasons = Array.from(
    new Set(
      mcdavid
        .filter((g) => g.game_context === "first_round")
        .map((g) => g.season),
    ),
  ).sort();
  const firstRoundBySeason = firstRoundSeasons.map((season) => {
    const rows = mcdavid.filter(
      (g) => g.game_context === "first_round" && g.season === season,
    );
    return {
      season,
      opponent: rows[0]?.opponent ?? "—",
      n: rows.length,
      ppg: mean(rows.map((g) => g.points)),
      pm: rows.reduce((s, g) => s + g.plus_minus, 0),
      record: `${rows.filter((g) => g.result === "W").length}–${
        rows.filter((g) => g.result === "L").length
      }`,
    };
  });
  const latestFirstRound = firstRoundBySeason[firstRoundBySeason.length - 1];

  // Every playoff series in the window, so the callout below can say where
  // the newest one ranks rather than asserting it is unique.
  const playoffSeriesCount = new Set(
    playoffs.map((g) => `${g.season}|${g.game_context}`),
  ).size;

  const nhlOnly = mcdavid.filter((g) =>
    NHL_CONTEXT_ORDER.includes(g.game_context),
  );
  const elim = nhlOnly.filter((g) => g.is_elimination_game);
  const elimWins = elim.filter((g) => g.result === "W");
  const elimLosses = elim.filter((g) => g.result === "L");

  // ---- Act II ----
  const fnf = mcdavid.filter((g) =>
    g.game_context.toLowerCase().includes("four_nations"),
  );
  const fnfPts = mean(fnf.map((g) => g.points));

  // ---- Act III ----
  const oly = mcdavid.filter((g) =>
    g.game_context.toLowerCase().includes("olympic"),
  );
  // Kept so a genuine pre-tournament exhibition, if one is ever entered,
  // stays out of the competitive chart. The 2026 games vs CZH/SUI/FRA were
  // group-stage games mislabelled as exhibitions -- they count toward the
  // tournament record, so excluding them left this chart showing three games
  // and four points directly beneath a sentence about thirteen.
  const olyCompetitive = oly.filter(
    (g) => !g.game_context.toLowerCase().includes("exhibition"),
  );
  const olyTotal = oly.reduce((s, g) => s + g.points, 0);

  const act1 = (
    <>
      <h2>The rounds get harder. So does everyone.</h2>
      <p>
        McDavid&rsquo;s scoring rate holds up through the first three rounds and
        gives way in the Finals. The more specific pattern is inside the series
        rather than across them.
      </p>

      <StatRow>
        {byContext.map(({ ctx, points, n }) => (
          <Stat
            key={ctx}
            label={contextLabel(ctx)}
            value={fmt(points)}
            unit="pts"
            accent={ctx === "stanley_cup_finals"}
            note={
              ctx === "regular_season"
                ? `n=${n}`
                : `${fmtSigned(points - rsPts)} vs regular season · n=${n}`
            }
          />
        ))}
      </StatRow>

      <Figure
        title="Production holds through Game 5, then falls"
        subtitle="Average points by game number within a playoff series, all rounds pooled."
        number={2}
        caption={
          <>
            The most-replicated NHL finding in Phase 1. Later games in a series
            are also the higher-leverage ones, so fatigue and opponent quality
            are entangled here — the model page separates them.
          </>
        }
      >
        <GameNumberFigure
          points={byGameNumber}
          regularSeasonAvg={rsPts}
          maxGame={gameNumbers[gameNumbers.length - 1]}
        />
      </Figure>

      <DataTable
        caption="The values plotted in Fig. 2."
        columns={[
          { key: "g", header: "Game in series" },
          { key: "avg", header: "Avg points", numeric: true },
          { key: "n", header: "n", numeric: true },
        ]}
        rows={byGameNumber.map((r) => ({
          g: r.gameNumber,
          avg: fmt(r.avg),
          n: r.n,
        }))}
      />

      <h3>Elimination games</h3>
      <p>
        The split runs the opposite way to the narrative: his average is{" "}
        <em>higher</em> in elimination games than outside them, and the average
        is carried by the wins.
      </p>
      <StatRow>
        <Stat label="Regular season" value={fmt(rsPts)} unit="pts/game" />
        <Stat
          label={`Elimination wins · n=${elimWins.length}`}
          value={elimWins.length ? fmt(mean(elimWins.map((g) => g.points))) : "—"}
          unit="pts/game"
        />
        <Stat
          label={`Elimination losses · n=${elimLosses.length}`}
          value={
            elimLosses.length ? fmt(mean(elimLosses.map((g) => g.points))) : "—"
          }
          unit="pts/game"
        />
      </StatRow>
      <p className="figure-sub">
        Phase 2 Test 2 picked this up as a large effect size on the losses — on
        a sample of {elimLosses.length}, which is too small to test.
      </p>

      <h3>The {latestFirstRound?.season} first round</h3>
      <p>
        Every number above pools the first round across seasons, and pooling is
        what hides the newest series. Split by season, one of them does not
        look like the others.
      </p>

      <DataTable
        caption="First-round series, by season. One row per series."
        columns={[
          { key: "season", header: "Season" },
          { key: "opponent", header: "Opponent" },
          { key: "record", header: "W–L" },
          { key: "ppg", header: "Pts/game", numeric: true },
          { key: "vs", header: "vs regular season", numeric: true },
          { key: "pm", header: "+/−", numeric: true },
        ]}
        rows={firstRoundBySeason.map((r) => ({
          season: r.season,
          opponent: r.opponent,
          record: r.record,
          ppg: fmt(r.ppg),
          vs: fmtSigned(r.ppg - rsPts),
          pm: fmtSigned(r.pm, 0),
        }))}
      />

      <Callout kind="warn" label="The season that cuts the other way">
        <p>
          In {latestFirstRound?.season} Edmonton lost the first round to{" "}
          {latestFirstRound?.opponent} {latestFirstRound?.record}, and
          McDavid&rsquo;s production went with them:{" "}
          {fmt(latestFirstRound?.ppg ?? NaN)} points per game against a{" "}
          {fmt(rsPts)} regular-season rate, at{" "}
          {fmtSigned(latestFirstRound?.pm ?? NaN, 0)}. That drop is larger than
          his Stanley Cup Finals drop and larger than MacKinnon&rsquo;s — the
          comparison the <Link href="/">headline</Link> rests on.
        </p>
        <p>
          It is one series of {latestFirstRound?.n} games against a single
          opponent, so it settles nothing on its own. It is worth naming
          anyway: of the {playoffSeriesCount} playoff series in this window it
          is his lowest-scoring and his worst by plus/minus. Stated plainly
          rather than averaged away — the reframing this project argues for is
          drawn from the Finals, and the newest evidence in the dataset
          doesn&rsquo;t fit it.
        </p>
      </Callout>
    </>
  );

  const act2 = (
    <>
      <h2>He won it, and scored the winner</h2>
      <p>
        Canada took the 2025 Four Nations Face-Off, and McDavid scored the
        overtime goal in the final against the United States. His only loss in
        the tournament was the group-stage meeting with the same opponent —
        Connor Hellebuyck in net.
      </p>

      <Figure
        title="Four Nations Face-Off, game by game"
        subtitle="Points per game. Wins carry the series color; losses are neutral."
        legend={RESULT_LEGEND}
        number={3}
        caption="Result is labelled on every column as well as colored, so the outcome never depends on hue alone."
      >
        <GameByGameFigure
          games={fnf}
          ariaLabel="Bar chart of McDavid's points in each Four Nations game. Each column is labelled with the opponent, date, and result. Values are listed in the table below."
        />
      </Figure>

      <DataTable caption="Every Four Nations game." columns={GAME_COLUMNS} rows={gameRows(fnf)} />

      <StatRow>
        <Stat
          label="Tournament average"
          value={fmt(fnfPts)}
          unit="pts/game"
          note={`${fmtSigned(fnfPts - rsPts)} vs regular season · n=${fnf.length}`}
        />
        <Stat label="Outcome" value="Gold" note="Won the final in overtime." />
      </StatRow>
    </>
  );

  const act3 = (
    <>
      <h2>A scoring record, and one pointless night</h2>
      <p>
        McDavid set the Olympic scoring record at Milan Cortina with{" "}
        {olyTotal} points in six games. Then came the gold medal game against
        the United States: Hellebuyck in net, a 1&ndash;2 overtime loss, and
        McDavid held without a point.
      </p>

      <Figure
        title="Every Olympic game"
        subtitle="Group stage and knockouts, in tournament order."
        legend={RESULT_LEGEND}
        number={4}
        caption="The single scoreless column is the gold medal game."
      >
        <GameByGameFigure
          games={olyCompetitive}
          ariaLabel="Bar chart of McDavid's points in each Olympic game. Each column is labelled with the opponent, date, and result. Values are listed in the table below."
        />
      </Figure>

      <DataTable
        caption="Every Olympic game."
        columns={GAME_COLUMNS}
        rows={gameRows(oly)}
      />

      <StatRow>
        <Stat label="Olympic points" value={olyTotal} note="A tournament record." />
        <Stat label="Gold medal game" value="0" unit="pts" note="Minus two, versus Hellebuyck." />
        <Stat label="Outcome" value="Silver" note="Lost the final in overtime." />
      </StatRow>

      <Callout kind="warn" label="The pattern, and its limit">
        <p>
          Across both tournaments, McDavid&rsquo;s only pointless games come
          against the United States with Hellebuyck starting. That is three
          games, inside one window — a pattern worth naming and far too small to
          test.
        </p>
      </Callout>
    </>
  );

  return (
    <>
      <PageHeader
        kicker="Three Acts"
        title="Three stages, one question"
        dek={
          <>
            The same player across the Stanley Cup Playoffs, the 2025 Four
            Nations Face-Off, and the 2026 Winter Olympics — measured against
            his own regular-season baseline.
          </>
        }
      />
      <Tabs
        labels={[
          "I · Stanley Cup Playoffs",
          "II · Four Nations",
          "III · Winter Olympics",
        ]}
        panels={[
          <Fragment key="playoffs">{act1}</Fragment>,
          <Fragment key="four-nations">{act2}</Fragment>,
          <Fragment key="olympics">{act3}</Fragment>,
        ]}
      />
    </>
  );
}
