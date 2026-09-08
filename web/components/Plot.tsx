"use client";

/**
 * Client-side Plotly wrapper.
 *
 * Loads `plotly.js-basic-dist-min` (bar + scatter only, ~1MB vs ~4MB for the
 * full bundle) dynamically so it never touches the server render.
 *
 * Because Plotly can't read CSS custom properties, the caller builds its
 * traces and layout from a resolved ChartTheme. This component owns that
 * theme: it reads it after mount and re-reads on a color-scheme change, so
 * charts follow dark mode without a reload.
 */
import { useEffect, useRef, useState } from "react";
import { ChartTheme, readChartTheme } from "@/lib/charts";

type PlotlyModule = {
  newPlot: (
    node: HTMLElement,
    data: unknown,
    layout: unknown,
    config: unknown,
  ) => Promise<unknown>;
  purge: (node: HTMLElement) => void;
  Plots: { resize: (node: HTMLElement) => void };
};

type PlotProps = {
  /** Built from the theme this component resolves. */
  build: (theme: ChartTheme) => {
    data: Record<string, unknown>[];
    layout: Record<string, unknown>;
  };
  height?: number;
  ariaLabel: string;
};

export default function Plot({ build, height = 340, ariaLabel }: PlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ChartTheme | null>(null);

  // Resolve after mount (needs the DOM) and again whenever the scheme flips.
  useEffect(() => {
    setTheme(readChartTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme(readChartTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node || !theme) return;

    let disposed = false;
    let observer: ResizeObserver | undefined;
    const { data, layout } = build(theme);

    import("plotly.js-basic-dist-min").then((mod) => {
      const Plotly = ((mod as { default?: unknown }).default ??
        mod) as PlotlyModule;
      if (disposed) return;

      Plotly.newPlot(node, data, { ...layout, height }, {
        displayModeBar: false,
        responsive: true,
      }).then(() => {
        if (disposed) return;
        // `responsive: true` only tracks window resizes; layout changes can
        // resize the container without one.
        //
        // Only react to WIDTH changes. The container's height is driven by the
        // chart it contains, so resizing on height feeds back into itself:
        // resize() -> container grows -> observer fires -> resize() ... which
        // hangs the page.
        let lastWidth = node.clientWidth;
        observer = new ResizeObserver(() => {
          const width = node.clientWidth;
          if (width === lastWidth) return;
          lastWidth = width;
          Plotly.Plots.resize(node);
        });
        observer.observe(node);
      });
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      import("plotly.js-basic-dist-min").then((mod) => {
        const Plotly = ((mod as { default?: unknown }).default ??
          mod) as PlotlyModule;
        Plotly.purge(node);
      });
    };
  }, [build, theme, height]);

  return (
    <div
      ref={ref}
      className="plot"
      role="img"
      aria-label={ariaLabel}
      style={{ width: "100%", minHeight: height }}
    />
  );
}
