import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { mcdavid, mackinnon, pipeline } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "Variance97 — McDavid in High-Stakes Hockey",
  description:
    "A data-science investigation of Connor McDavid's performance in the NHL " +
    "Stanley Cup Playoffs, the 2025 Four Nations Face-Off, and the 2026 Winter Olympics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const refreshed = pipeline.files.find((f) =>
    f.path.endsWith("mcdavid_game_log_clean.csv"),
  )?.last_refreshed;

  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <h1>🏒 Variance97</h1>
            <p className="tagline">McDavid in high-stakes hockey</p>
            <Nav />
            <section>
              <h2>About</h2>
              <p>
                Built from a notebook-driven investigation across four phases.
                Source code, methodology, and full limitations document on{" "}
                <a
                  href="https://github.com/KylanHuynh7/Variance97"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
                .
              </p>
            </section>
            <section>
              <h2>Latest data</h2>
              <p>
                {refreshed ? <>Refreshed {refreshed}</> : null}
                <br />
                {mcdavid.length} McDavid games · {mackinnon.length} MacKinnon
                games
              </p>
            </section>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
