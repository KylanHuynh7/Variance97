"use client";

import { useCallback } from "react";
import Plot from "@/components/Plot";
import { ChartTheme, peerBars, peerLayout } from "@/lib/charts";

export default function PeerFigure({
  labels,
  mcd,
  mac,
}: {
  labels: string[];
  mcd: (number | null)[];
  mac: (number | null)[];
}) {
  const build = useCallback(
    (t: ChartTheme) => ({
      data: peerBars(t, labels, mcd, mac, "pts/game"),
      layout: peerLayout(t, "Points per game"),
    }),
    [labels, mcd, mac],
  );
  return (
    <Plot
      build={build}
      height={330}
      ariaLabel="Grouped bar chart: McDavid and MacKinnon points per game across five NHL contexts. Values are listed in the table below."
    />
  );
}
