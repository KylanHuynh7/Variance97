import type { Metadata } from "next";
import { Newsreader, Inter, IBM_Plex_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import { generatedAt, mcdavid, pipeline } from "@/lib/data";
import "./globals.css";

/* Serif carries the display voice; sans carries everything measured — body
   copy, tables, stat figures, chart labels. */
const serif = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  axes: ["opsz"],
});
const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Variance97 — McDavid in high-stakes hockey",
    template: "%s — Variance97",
  },
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
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <Nav />
        <main className="page">
          {children}
          <footer className="colophon">
            <div>
              <strong>About</strong>
              Built from a notebook-driven investigation across four phases.
              Source, methodology, and the full limitations document are on{" "}
              <a
                href="https://github.com/KylanHuynh7/Variance97"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              .
            </div>
            <div>
              <strong>Data</strong>
              {mcdavid.length} McDavid games through {pipeline.latest_game}.
              {refreshed ? <> Sources refreshed {refreshed}.</> : null} Bundle
              built {generatedAt}.
            </div>
            <div>
              <strong>Method</strong>
              Every figure is computed at build time from the clean CSVs — the
              site makes no API calls and runs no model at page load.
            </div>
          </footer>
        </main>
      </body>
    </html>
  );
}
