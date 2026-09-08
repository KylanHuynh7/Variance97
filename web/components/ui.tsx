/**
 * Editorial primitives. These replace the Streamlit-shaped widgets the first
 * port inherited (st.metric boxes, st.info panels, st.dataframe): a stat is a
 * row of figures under a rule, a chart is a captioned figure, a callout is a
 * labelled aside.
 *
 * All server-renderable — no client JS.
 */
import React from "react";

export function PageHeader({
  kicker,
  title,
  dek,
}: {
  kicker: string;
  title: React.ReactNode;
  dek?: React.ReactNode;
}) {
  return (
    <header>
      <p className="kicker">{kicker}</p>
      <h1 className="display">{title}</h1>
      {dek ? <p className="dek">{dek}</p> : null}
    </header>
  );
}

/**
 * A chart with its own title, legend, and numbered caption. The legend is
 * HTML rather than Plotly's so series names stay in text tokens with a small
 * color swatch beside them — identity is never carried by color alone.
 */
export function Figure({
  title,
  subtitle,
  legend,
  number,
  caption,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  legend?: { label: string; color: string }[];
  number?: number;
  caption?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <figure>
      <div className="figure-head">
        <p className="figure-title">{title}</p>
        {subtitle ? <p className="figure-sub">{subtitle}</p> : null}
      </div>
      {legend?.length ? (
        <ul className="legend">
          {legend.map((l) => (
            <li key={l.label}>
              <span className="swatch" style={{ background: l.color }} />
              {l.label}
            </li>
          ))}
        </ul>
      ) : null}
      {children}
      {caption ? (
        <figcaption>
          {number !== undefined ? (
            <span className="fig-no">Fig. {number} — </span>
          ) : null}
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="stat-row">{children}</div>;
}

export function Stat({
  label,
  value,
  unit,
  note,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={accent ? "stat is-accent" : "stat"}>
      <span className="stat-label">{label}</span>
      <div className="stat-value">
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      {note ? <p className="stat-note">{note}</p> : null}
    </div>
  );
}

export function Callout({
  kind = "note",
  label,
  children,
}: {
  kind?: "note" | "key" | "warn" | "caveat";
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <aside className={`callout ${kind}`}>
      {label ? <span className="callout-label">{label}</span> : null}
      {children}
    </aside>
  );
}

export type Column = { key: string; header: string; numeric?: boolean };

export function DataTable({
  columns,
  rows,
  caption,
}: {
  columns: Column[];
  rows: Record<string, React.ReactNode>[];
  caption?: React.ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table>
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.numeric ? "num" : undefined} scope="col">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className={c.numeric ? "num" : undefined}>
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Rule() {
  return <hr className="rule" />;
}

export function Disclosure({
  summary,
  children,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details>
      <summary>{summary}</summary>
      <div className="details-body">{children}</div>
    </details>
  );
}
