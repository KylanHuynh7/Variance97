"use client";

import { useCallback } from "react";
import Plot from "@/components/Plot";
import {
  ChartTheme,
  ResultGame,
  gameBars,
  gameLayout,
  gameNumberLayout,
  gameNumberTrace,
} from "@/lib/charts";

export function GameNumberFigure({
  points,
  regularSeasonAvg,
  maxGame,
}: {
  points: { gameNumber: number; avg: number }[];
  regularSeasonAvg: number;
  maxGame: number;
}) {
  const build = useCallback(
    (t: ChartTheme, w: number) => ({
      data: gameNumberTrace(t, points),
      layout: gameNumberLayout(t, regularSeasonAvg, maxGame, w),
    }),
    [points, regularSeasonAvg, maxGame],
  );
  return (
    <Plot
      build={build}
      height={320}
      ariaLabel="Line chart of McDavid's average points by game number within a playoff series, against his regular-season average. Values are listed in the table below."
    />
  );
}

export function GameByGameFigure({
  games,
  ariaLabel,
}: {
  games: ResultGame[];
  ariaLabel: string;
}) {
  const build = useCallback(
    (t: ChartTheme, w: number) => ({
      data: gameBars(t, games),
      layout: gameLayout(t, w),
    }),
    [games],
  );
  return <Plot build={build} height={310} ariaLabel={ariaLabel} />;
}
