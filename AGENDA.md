# Agenda

Where the last session stopped, and what comes next.

**Rewrite this file at the end of every session.** It is not a history: when an
item is done, delete it here and record it in `METHODOLOGY.md` (§11 decision
log, plus any section whose choices changed). Anything still true next time
stays. For *how* and *why*, see `METHODOLOGY.md`.

**Last updated:** 2026-09-14

---

## Current state

| | |
| --- | --- |
| `main` | Clean and pushed. Everything is merged and deployed. |
| Live site | https://variance97.vercel.app, serving 11 model features including the goalie |
| Dataset | Through 2026-04-30: 478 McDavid games (468 NHL + 10 international), six players |
| Season | Offseason. **2026-27 opens in October 2026.** |
| Automation | Daily GitHub Action registered and active. **Not yet run on GitHub.** |

## Where we left off (2026-09-14)

- **Goalie features shipped.** The opposing starter's prior-year save% carries
  no signal (−0.010, sign unstable, worsens cross-validated fit). Written into
  LIMITATIONS #5, the README, both dashboards and notebook 03.
- **Daily GitHub Action shipped**, with `check_data.py` gating every publish.
  It was tested locally only: an offseason run changes nothing, and injected
  bugs are all caught.
- **Docs restructured.** `TRACING.md` was split into `METHODOLOGY.md` (grows)
  and this file (rewritten each session).
- **Streamlit removed.** The static site is the only dashboard. `--verify` now
  checks the exported model against sklearn's predictions instead of against
  a second copy. The Codespaces devcontainer runs the pipeline and site instead.

---

## Next up

1. **Run the Action once by hand.** GitHub → Actions → Update data → Run
   workflow. It should finish green with "No new data. Nothing to commit." If it
   fails, the failing step's log is the starting point. This is the only
   untested link.
2. **Watch the first in-season run (October 2026).** After opening night,
   confirm the Action commits new games and the site redeploys, and that the
   Pipeline Status page shows real refresh times. Also confirm the 2026-27
   standings stop being skipped once games are played.
3. **Advanced metrics (LIMITATIONS #4 and #7).** Natural Stat Trick or
   MoneyPuck, for on-ice goals for per 60, expected goals and scoring chances.
   The only route to testing H2 at all, and to goals saved above expected, the
   stronger goalie test. Open questions to settle before building:
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
  Harmless, since nothing reads them, but a cleanup via `--rebuild mackinnon`
  would align the schema.

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
