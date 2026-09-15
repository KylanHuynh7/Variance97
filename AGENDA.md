# Agenda

Where the last session stopped, and what comes next.

**Rewrite this file at the end of every session.** It is not a history: when an
item is done, delete it here and record it in `METHODOLOGY.md` (§11 decision
log, plus any section whose choices changed). Anything still true next time
stays. For *how* and *why*, see `METHODOLOGY.md`.

**Last updated:** 2026-09-14, end of session

---

## Start of next session

1. `git pull`. The daily Action may have pushed while you were away (it
   shouldn't in the offseason, but check).
2. Read this file, then the relevant `METHODOLOGY.md` sections for whatever
   you pick up.
3. Check whether the Action has run yet: GitHub → **Actions** tab. As of the
   end of this session it had **0 runs**.

---

## Current state

| | |
| --- | --- |
| `main` | Clean and pushed; the last code change is `ec9baa5`, followed only by this end-of-session docs commit. Everything is merged and deployed. |
| Live site | https://variance97.vercel.app, the only dashboard (Streamlit retired). Model has 11 features, including the opposing goalie. |
| Dataset | Through 2026-04-30: 478 McDavid games (468 NHL + 10 international), six players, 131 opposing goalies |
| Season | Offseason. **2026-27 opens in October 2026.** |
| Automation | Daily GitHub Action "Update data", 14:00 UTC. Registered and active on GitHub. **Never run on GitHub yet**; tested locally only. |
| Checks | `check_data.py` passes; `export_web.py --verify` passes (max error 6.5e-06); site builds |

## Where we left off (2026-09-14)

Four pieces of work shipped this session, in order:

1. **Goalie features.** The opposing starter's save% over the prior year
   carries no signal: −0.010, the sign flips with the shrinkage prior, and it
   worsens cross-validated fit. Bobrovsky was league average going into both
   Finals. Written into LIMITATIONS #5, the README, the site and notebook 03.
2. **Daily GitHub Action**, with `check_data.py` gating every publish and the
   Pipeline Status page dating files by git commit.
3. **Docs restructured.** `TRACING.md` split into `METHODOLOGY.md` (grows) and
   this file (rewritten each session). Draisaitl's Finals drop corrected from
   −0.61 to −0.60 everywhere.
4. **Streamlit removed.** `--verify` now checks the exported model reproduces
   sklearn's predictions rather than comparing against a second copy. The
   Codespaces devcontainer now sets up Python 3.13 + Node for the pipeline and
   site.

Nothing is half-finished. There are no open branches with unmerged work.

---

## Next up

1. **Run the Action once by hand.** GitHub → Actions → Update data → Run
   workflow. It should finish green with "No new data. Nothing to commit." This
   is the only untested link. If it fails, the failing step's log is the
   starting point. The likeliest trouble spots on a first run are the Python
   dependency install and the `git push` step's permissions.
2. **Watch the first in-season run (October 2026).** After opening night,
   confirm the Action commits new games and the site redeploys, the Pipeline
   Status page shows real refresh times, and the 2026-27 standings stop being
   skipped once games are played.
3. **Advanced metrics (LIMITATIONS #4 and #7).** Natural Stat Trick or
   MoneyPuck, for on-ice goals for per 60, expected goals and scoring chances.
   The only route to testing H2 at all, and to goals saved above expected (the
   stronger goalie test). Open questions to settle before building:
   - Which source allows automated per-game pulls (terms of use, rate limits)?
   - Can it be added to the Action, or does it need a manual step?
   - Game-level on-ice data for McDavid, or line-level?

### Smaller, open

- `opp_ga_per_game` is an end-of-season snapshot. A trailing goals-against rate
  as of each game date would fix LIMITATIONS #8. Minor engineering.
- `rest_days` comes from McDavid's own game gaps, not Edmonton's schedule
  (LIMITATIONS #9). The coefficient is −0.081, so it is worth measuring
  correctly. Trivial via the team schedule endpoint.
- International team strength is unmodelled, which keeps Phase 3 NHL-only
  (LIMITATIONS #6).
- MacKinnon's source and clean CSVs carry two columns the other players' files
  don't (`gameId`, `home_away`), left over from before the shared schema.
  Harmless, since nothing reads them. `--rebuild mackinnon` would align the
  schema; re-run `check_data.py` afterwards.

### Waiting on Kylan

- **Delete the stray `web` Vercel project?** It is safe to delete (nothing is
  aliased to it) but needs your say-so. See METHODOLOGY §10.
- **Look at `/peer-comparison` in a browser.** Its charts were only verified
  programmatically; nobody has seen it rendered.
- **`PHASE4_PLAN.md` and `PHASE5_PLAN.md`:** keep them as historical plans, or
  fold what is still relevant into `METHODOLOGY.md` and delete them?

---

## Recurring upkeep

- **Every autumn:** GitHub disables scheduled workflows after 60 days without a
  commit, and the offseason is longer. Before the October opener, open the
  Actions tab and click **Enable workflow** on "Update data" if prompted.
- **After adding a player or touching the fetchers:** run `check_data.py` and
  `export_web.py --verify` before trusting the numbers.
- **End of every session:** rewrite this file, and add what changed to
  METHODOLOGY's decision log.
