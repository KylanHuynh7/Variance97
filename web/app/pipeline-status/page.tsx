import { Metric, MetricRow, Table } from "@/components/ui";
import { contextLabel, generatedAt, pipeline } from "@/lib/data";

export const metadata = { title: "Pipeline Status · Variance97" };

export default function PipelineStatusPage() {
  return (
    <>
      <h1 className="page-title">Pipeline Status</h1>
      <p>
        Operational view of the Phase 4 data pipeline. The site is fully static —
        every number on it was computed at build time by{" "}
        <code>data/build/export_web.py</code> from local CSVs that{" "}
        <code>data/build/update_all.py</code> keeps fresh. No live API calls
        happen from this app, and none happen at page load.
      </p>

      <h2>Source files</h2>
      <Table
        columns={[
          { key: "label", header: "File" },
          { key: "path", header: "Path" },
          { key: "refreshed", header: "Last refreshed" },
          { key: "size", header: "Size (KB)", numeric: true },
        ]}
        rows={pipeline.files.map((f) => ({
          label: f.label,
          path: <code>{f.path}</code>,
          refreshed: f.last_refreshed,
          size: f.size_kb,
        }))}
      />

      <h2>McDavid coverage</h2>
      <MetricRow>
        <Metric label="Total games" value={pipeline.total_games} />
        <Metric label="Latest game" value={pipeline.latest_game} />
        <Metric label="Seasons" value={pipeline.seasons} />
        <Metric label="Bundle built" value={generatedAt} />
      </MetricRow>

      <h3>Games per season / context</h3>
      <Table
        columns={[
          { key: "season", header: "Season" },
          { key: "context", header: "Game context" },
          { key: "games", header: "Games", numeric: true },
        ]}
        rows={pipeline.per_season.map((r) => ({
          season: r.season,
          context: contextLabel(r.game_context),
          games: r.games,
        }))}
      />

      <h2>Refresh manually</h2>
      <p>
        Refresh the data and rebuild the web bundle in one step, then push — the
        deployment rebuilds automatically:
      </p>
      <pre>
        <code>
          bash scripts/run_update.sh{"\n"}
          git add data web/public/data.json{"\n"}
          git commit -m &quot;data: refresh&quot; &amp;&amp; git push
        </code>
      </pre>
      <p className="caption">
        The pipeline is idempotent — running with no new games reports{" "}
        <code>+0</code> and exits cleanly. See <code>PHASE4_PLAN.md</code> for
        the architecture.
      </p>
    </>
  );
}
