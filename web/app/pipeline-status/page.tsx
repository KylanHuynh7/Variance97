import { DataTable, PageHeader, Stat, StatRow } from "@/components/ui";
import { contextLabel, generatedAt, pipeline } from "@/lib/data";

export const metadata = { title: "Pipeline" };

export default function PipelineStatusPage() {
  return (
    <>
      <PageHeader
        kicker="Pipeline"
        title="Where these numbers come from"
        dek={
          <>
            Every figure on this site is computed at build time from local CSVs.
            Nothing here calls an API at page load, and no model runs in a
            request.
          </>
        }
      />

      <StatRow>
        <Stat label="McDavid games" value={pipeline.total_games} />
        <Stat label="Latest game" value={pipeline.latest_game} />
        <Stat label="Seasons" value={pipeline.seasons} />
        <Stat label="Bundle built" value={generatedAt} />
      </StatRow>

      <h2>Source files</h2>
      <p>
        The NHL logs and standings are API-derived and rebuilt incrementally.
        The international file is entered by hand — the NHL API doesn&rsquo;t
        cover those tournaments.
      </p>
      <DataTable
        columns={[
          { key: "label", header: "File" },
          { key: "path", header: "Path" },
          { key: "refreshed", header: "Last refreshed" },
          { key: "size", header: "KB", numeric: true },
        ]}
        rows={pipeline.files.map((f) => ({
          label: f.label,
          path: <code>{f.path}</code>,
          refreshed: f.last_refreshed,
          size: f.size_kb,
        }))}
      />

      <h2>Coverage by season</h2>
      <DataTable
        columns={[
          { key: "season", header: "Season" },
          { key: "context", header: "Context" },
          { key: "games", header: "Games", numeric: true },
        ]}
        rows={pipeline.per_season.map((r) => ({
          season: r.season,
          context: contextLabel(r.game_context),
          games: r.games,
        }))}
      />

      <h2>Refreshing</h2>
      <p>
        One command refreshes the CSVs from the NHL API and re-exports the build
        bundle the site reads. Pushing the result redeploys it.
      </p>
      <pre>
        <code>
          bash scripts/run_update.sh{"\n"}
          git add data web/public/data.json{"\n"}
          git commit -m &quot;data: refresh&quot; &amp;&amp; git push
        </code>
      </pre>
      <p className="figure-sub">
        The pipeline is idempotent — a run with no new games reports{" "}
        <code>+0</code> and exits cleanly, so it is safe on a daily cron during
        the season.
      </p>
    </>
  );
}
