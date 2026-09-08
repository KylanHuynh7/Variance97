"use client";

import { useCallback } from "react";
import Plot from "@/components/Plot";
import { ChartTheme, SignedItem, signedBars, signedLayout } from "@/lib/charts";

export default function CoefficientFigure({ items }: { items: SignedItem[] }) {
  const build = useCallback(
    (t: ChartTheme) => ({
      data: signedBars(t, items, ""),
      layout: signedLayout(
        t,
        "Coefficient (standardized features)",
        items.map((i) => i.value),
      ),
    }),
    [items],
  );
  return (
    <Plot
      build={build}
      height={400}
      ariaLabel="Horizontal bar chart of standardized Ridge regression coefficients. Values are listed in the table below."
    />
  );
}
