/**
 * Prose blocks, ported verbatim from app/components/narrative.py.
 * Keeping the writing in one place keeps the voice consistent and makes it
 * easy to diff against the Streamlit app when checking the port.
 */
import React from "react";

export const HEADLINE = (
  <>
    <p>
      <strong>
        The popular narrative is simple: Connor McDavid can&rsquo;t win the big
        one. The data tells a more specific story.
      </strong>
    </p>
    <p>
      McDavid won the 2025 Four Nations Face-Off (scoring the OT winner
      himself), set the Olympic scoring record at the 2026 Milan Cortina Games
      (13 points in 6 games), and his individual Stanley Cup Finals production
      drops about 0.28 points per game vs his regular season &mdash; but{" "}
      <strong>
        Nathan MacKinnon&rsquo;s drop is twice as large (0.54), and he won the
        Cup in 2022.
      </strong>
    </p>
    <p>
      So the working thesis isn&rsquo;t{" "}
      <em>&ldquo;McDavid underperforms in championship games&rdquo;</em>.
      It&rsquo;s narrower: his teams keep losing deep playoff runs even when his
      individual production isn&rsquo;t unusually low for an elite forward.
    </p>
  </>
);

export const PEER_FOOTER = (
  <p>
    MacKinnon&rsquo;s regular-season-to-Stanley-Cup-Finals drop is roughly twice
    McDavid&rsquo;s, and he won the Cup. McDavid&rsquo;s individual Finals
    decline is <em>smaller</em> than a directly comparable peer&rsquo;s &mdash;
    it isn&rsquo;t outlier-bad. The popular &ldquo;can&rsquo;t perform on the big
    stage&rdquo; framing doesn&rsquo;t survive contact with peer data.
  </p>
);

export const CONFOUND_CALLOUT = (
  <>
    <p>
      <strong>Two confounds bound everything below.</strong> They aren&rsquo;t
      bugs to fix &mdash; they&rsquo;re facts about the data:
    </p>
    <ol>
      <li>
        <strong>Florida &harr; Stanley Cup Finals are perfectly entangled.</strong>{" "}
        Edmonton&rsquo;s only two SCF appearances in the dataset are both vs the
        Panthers. Statistically we cannot separate &ldquo;Stanley Cup Finals
        effect&rdquo; from &ldquo;vs Florida effect.&rdquo;
      </li>
      <li>
        <strong>Hellebuyck sample is n=3.</strong> All three games are in one
        tournament window (Four Nations + Olympics).
      </li>
    </ol>
    <p>The Limitations page has the full list.</p>
  </>
);

export const FEATURE_PAGE_DISCLAIMER = (
  <>
    <p>
      This model performs at baseline (R&sup2; near zero on held-out games). It
      is <strong>not a deployable predictor.</strong> Use this page to
      understand which features carry signed weight in the regression &mdash;{" "}
      <em>not</em> to predict tonight&rsquo;s game.
    </p>
    <p>
      The interesting result is{" "}
      <strong>what dropped, not what kept rank.</strong> When the original
      notebook&rsquo;s logistic regression had only <code>game_context</code> to
      work with, &ldquo;Stanley Cup Finals&rdquo; dominated with coefficient
      +0.67. Once real gameplay features compete (<code>opp_ga_per_game</code>,{" "}
      <code>game_number</code>, <code>rolling_pts_5</code>), the SCF coefficient
      collapses to roughly &minus;0.07. The variance reroutes to late-series
      fatigue and opponent defensive quality.
    </p>
  </>
);
