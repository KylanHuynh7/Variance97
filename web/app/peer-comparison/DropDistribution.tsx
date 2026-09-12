"use client";

import { useCallback } from "react";
import Plot from "@/components/Plot";
import { ChartTheme, dropDistribution, dropLayout } from "@/lib/charts";

export type DropRow = { name: string; value: number; isSubject: boolean };

/**
 * Where McDavid's Finals decline sits among his peers'.
 *
 * Rows arrive already sorted; the order is the finding, so it is decided
 * where the data is and not here.
 */
export default function DropDistribution({ rows }: { rows: DropRow[] }) {
  const build = useCallback(
    (t: ChartTheme, w: number) => ({
      data: dropDistribution(t, rows),
      layout: dropLayout(t, rows, w),
    }),
    [rows],
  );

  return (
    <Plot
      build={build}
      height={68 + rows.length * 46}
      ariaLabel={
        "Dot plot of each player's change in points per game from the regular " +
        "season to the Stanley Cup Finals, sorted from smallest decline to " +
        "largest. Values are listed in the table below."
      }
    />
  );
}
