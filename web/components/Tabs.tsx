"use client";

import { useState } from "react";

/**
 * Only the active panel is mounted. Plotly measures its container on
 * newPlot, and a `display: none` panel measures as zero — which made charts
 * in background tabs render at Plotly's 700px fallback width. Mounting
 * lazily means every chart is drawn against a real width.
 */
export default function Tabs({
  labels,
  panels,
}: {
  labels: string[];
  panels: React.ReactNode[];
}) {
  const [active, setActive] = useState(0);
  return (
    <>
      <div className="tabs" role="tablist">
        {labels.map((label, i) => (
          <button
            key={label}
            role="tab"
            type="button"
            aria-selected={i === active}
            aria-controls="tabpanel"
            onClick={() => setActive(i)}
          >
            {label}
          </button>
        ))}
      </div>
      <div id="tabpanel" role="tabpanel" className="tabpanel">
        {panels[active]}
      </div>
    </>
  );
}
