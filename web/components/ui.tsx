/**
 * Small presentational primitives that stand in for the Streamlit widgets the
 * original app leaned on (st.metric, st.dataframe, st.info/success/warning/error).
 * Server-renderable — no client JS.
 */
import React from "react";

export function Metric({
  label,
  value,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
}) {
  return (
    <div className="metric">
      <span className="label">{label}</span>
      <div className="value">{value}</div>
      {delta ? <div className="delta">{delta}</div> : null}
    </div>
  );
}

export function MetricRow({ children }: { children: React.ReactNode }) {
  return <div className="metric-row">{children}</div>;
}

export function Callout({
  kind,
  children,
}: {
  kind: "info" | "success" | "warning" | "error";
  children: React.ReactNode;
}) {
  return <div className={`callout ${kind}`}>{children}</div>;
}

export type Column = { key: string; header: string; numeric?: boolean };

export function Table({
  columns,
  rows,
}: {
  columns: Column[];
  rows: Record<string, React.ReactNode>[];
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.numeric ? "num" : undefined}>
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

export function Divider() {
  return <hr className="divider" />;
}
