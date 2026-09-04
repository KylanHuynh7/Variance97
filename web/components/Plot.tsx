"use client";

/**
 * Thin client-side wrapper around plotly.js.
 *
 * We load `plotly.js-basic-dist-min` (bar + scatter only, ~1MB vs ~4MB for the
 * full bundle) dynamically so it never touches the server render, and call
 * Plotly directly rather than going through react-plotly.js.
 */
import { useEffect, useRef } from "react";

type PlotProps = {
  data: Record<string, unknown>[];
  layout?: Record<string, unknown>;
  height?: number;
  ariaLabel: string;
};

type PlotlyModule = {
  newPlot: (node: HTMLElement, data: unknown, layout: unknown, config: unknown) => Promise<unknown>;
  purge: (node: HTMLElement) => void;
  Plots: { resize: (node: HTMLElement) => void };
};

const BASE_LAYOUT = {
  font: {
    family:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    size: 13,
  },
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  hoverlabel: { font: { size: 13 } },
};

export default function Plot({ data, layout, height = 380, ariaLabel }: PlotProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let disposed = false;
    let observer: ResizeObserver | undefined;

    import("plotly.js-basic-dist-min").then((mod) => {
      const Plotly = ((mod as { default?: unknown }).default ?? mod) as PlotlyModule;
      if (disposed) return;

      // Plotly can't read CSS variables, so resolve the text color first.
      const color = getComputedStyle(node).getPropertyValue("color").trim();
      const merged = {
        ...BASE_LAYOUT,
        ...layout,
        height,
        font: { ...BASE_LAYOUT.font, ...(layout?.font as object), color },
      };

      Plotly.newPlot(node, data, merged, {
        displayModeBar: false,
        responsive: true,
      }).then(() => {
        if (disposed) return;
        // `responsive: true` only tracks window resizes. The sidebar layout
        // can change a chart's width without one, so watch the container too.
        observer = new ResizeObserver(() => Plotly.Plots.resize(node));
        observer.observe(node);
      });
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      import("plotly.js-basic-dist-min").then((mod) => {
        const Plotly = ((mod as { default?: unknown }).default ?? mod) as PlotlyModule;
        Plotly.purge(node);
      });
    };
  }, [data, layout, height]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      style={{ width: "100%", height, color: "var(--text)" }}
    />
  );
}
