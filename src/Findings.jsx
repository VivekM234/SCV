import { useEffect, useMemo, useState } from "react";
import { formatDate, loadLimits, toPpt } from "./lib.js";

// Each detected PFAS is compared with the strongest benchmark available:
//   1. EPA's legal limit (MCL), if EPA set one;
//   2. otherwise a state health-based guideline (Minnesota Department of
//      Health), which is not a legal limit;
//   3. otherwise Health Canada's precautionary objective for the TOTAL of
//      25 PFAS, since no agency has a guideline for that PFAS alone.
function classify(item, limit, guide, haveLimits) {
  const ppt = toPpt(item.maxValue);
  if (!haveLimits) return { level: "unknown", ppt };
  if (limit) return { level: ppt >= limit.mclPpt ? "atOrAbove" : "below", ppt };
  if (guide) return { level: ppt >= guide.ppt ? "guideAbove" : "guideBelow", ppt };
  return { level: "groupOnly", ppt };
}

const PILL_TEXT = {
  below: "Below EPA limit",
  atOrAbove: "At or above EPA limit",
  guideBelow: "Below health guideline",
  guideAbove: "At or above health guideline",
  groupOnly: "Counts toward total-PFAS guideline",
  unknown: "Limit unavailable",
};

// Which color each result uses (reuses the site's existing colors).
const TONE = {
  below: "below",
  atOrAbove: "atOrAbove",
  guideBelow: "below",
  guideAbove: "atOrAbove",
  groupOnly: "nolimit",
  unknown: "nolimit",
};

const RANK = {
  atOrAbove: 0,
  guideAbove: 1,
  below: 2,
  guideBelow: 3,
  groupOnly: 4,
  unknown: 5,
};

const listText = (names) =>
  new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(names);

// Adds the highest result for each PFAS on Health Canada's list of 25.
// Those highs can come from different days, so this can overstate the true
// total in any one sample. Treat it as an upper estimate.
function totalPfas(rows, total) {
  if (!total) return null;
  const set = new Set(total.compounds);
  const sum = rows
    .filter((r) => set.has(r.item.contaminant))
    .reduce((acc, r) => acc + r.ppt, 0);
  return Number(sum.toPrecision(3));
}

function Summary({ rows, tested, haveLimits, total, totalPpt }) {
  const overEpa = rows.filter((r) => r.level === "atOrAbove");
  const overGuide = rows.filter((r) => r.level === "guideAbove");
  const overTotal = total && totalPpt !== null && totalPpt >= total.ppt;

  let tone = "calm";
  let headline;
  let detail;

  if (rows.length === 0) {
    headline = "No PFAS were found at or above the lab's reporting levels.";
    detail = `This system's water was tested for ${tested} PFAS. "Not found" means below the smallest amount the lab can measure, which is not the same as zero.`;
  } else if (!haveLimits) {
    tone = "neutral";
    headline = `${rows.length} of ${tested} PFAS were found in this system's testing.`;
    detail =
      "The reference limits could not be loaded, so these results are not compared with them below.";
  } else if (overEpa.length > 0) {
    tone = "alert";
    headline = `In at least one sample, ${listText(
      overEpa.map((r) => r.item.contaminant)
    )} ${overEpa.length > 1 ? "were" : "was"} at or above EPA's legal limit.`;
    detail = `${
      overTotal
        ? `The total of all PFAS found (${totalPpt} ppt) is also above ${total.source}'s ${total.ppt} ppt guideline. `
        : ""
    }That is worth a closer look below and in your water utility's own water quality report. It is not a finding that the utility broke a rule: these are individual samples, and EPA checks averages over time. This site cannot tell you whether water is safe to drink.`;
  } else if (overGuide.length > 0 || overTotal) {
    tone = "alert";
    const parts = [];
    if (overGuide.length > 0) {
      parts.push(
        `${listText(overGuide.map((r) => r.item.contaminant))} ${
          overGuide.length > 1 ? "were" : "was"
        } at or above a health-based guideline`
      );
    }
    if (overTotal) {
      parts.push(
        `the total of these PFAS (${totalPpt} ppt) was at or above ${total.source}'s ${total.ppt} ppt guideline`
      );
    }
    headline = `No EPA legal limit was exceeded, but ${parts.join(", and ")}.`;
    detail =
      "Health-based guidelines are not legal limits, but health agencies set them as levels to stay below. It is worth asking your water utility about these results.";
  } else {
    headline =
      "PFAS were found, but every result was below EPA limits and health-based guidelines.";
    detail = `${rows.length} of ${tested} PFAS were found.${
      total && totalPpt !== null
        ? ` Together they add up to about ${totalPpt} ppt, below ${total.source}'s ${total.ppt} ppt guideline for total PFAS.`
        : ""
    } Below a guideline is not the same as none.`;
  }

  return (
    <div className={`summary ${tone}`}>
      <p className="summary-kicker">What we found</p>
      <p className="summary-headline">{headline}</p>
      <p>{detail}</p>
      <div className="summary-stats">
        <div>
          <strong>{rows.length}</strong>
          <span>of {tested} PFAS found</span>
        </div>
        <div>
          <strong>{haveLimits ? overEpa.length : "–"}</strong>
          <span>at or above an EPA limit</span>
        </div>
        {haveLimits && total && rows.length > 0 && (
          <div>
            <strong>
              {totalPpt} <small>ppt</small>
            </strong>
            <span>
              total PFAS · guideline {total.ppt} ppt
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const MDH_URL =
  "https://www.health.state.mn.us/communities/environment/hazardous/topics/pfashealth.html";
const HC_URL =
  "https://www.canada.ca/en/health-canada/services/publications/healthy-living/guidelines-canadian-drinking-water-quality-guideline-technical-document-perfluorooctane-sulfonate.html";

function Explainer({ asOf, sourceUrl }) {
  return (
    <details className="explainer">
      <summary>How to read these results</summary>
      <ul>
        <li>
          <strong>ppt means parts per trillion.</strong> One ppt is about one
          drop of water in 20 Olympic-size swimming pools. These are tiny
          amounts, and EPA&rsquo;s limits are measured the same way.
        </li>
        <li>
          <strong>An EPA limit</strong> is the highest amount the federal
          government allows in public drinking water. EPA&rsquo;s health goal
          for PFOA and PFOS is zero.
        </li>
        <li>
          <strong>These are single samples.</strong> The testing shown here
          took individual samples. EPA checks whether a utility meets its
          limits using averages over time, so one high sample is not the same
          as breaking a rule.
        </li>
        <li>
          <strong>Not found does not mean zero.</strong> It means the amount
          was below the smallest amount the lab can reliably measure.
        </li>
        <li>
          <strong>Health-based guidelines</strong> are used when EPA has no
          legal limit. They are levels health agencies recommend staying
          below, but they are not legal limits. This page uses the{" "}
          <a href={MDH_URL} target="_blank" rel="noreferrer">
            Minnesota Department of Health ↗
          </a>{" "}
          values for PFBS (100 ppt), PFBA (7,000 ppt) and PFHxA (200 ppt).
        </li>
        <li>
          <strong>Total PFAS.</strong> Most PFAS have no guideline of their
          own, so this page also adds them up and compares the total with{" "}
          <a href={HC_URL} target="_blank" rel="noreferrer">
            Health Canada&rsquo;s ↗
          </a>{" "}
          precautionary objective of 30 ppt for 25 PFAS combined. The total
          adds the highest result for each PFAS, which may come from different
          days, so it can be higher than any single sample.
        </li>
        <li>
          <strong>Limits are changing.</strong> The limits on this page were
          checked on {asOf}. EPA has proposed removing some of them, so
          confirm the current rules on{" "}
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            EPA&rsquo;s PFAS drinking water page ↗
          </a>
          .
        </li>
        <li>
          <strong>For official results,</strong> check your water
          utility&rsquo;s annual water quality report (also called a Consumer
          Confidence Report). This site does not cover private wells.
        </li>
      </ul>
    </details>
  );
}

function ChemicalCard({ row, stat, units, fullName, total, totalPpt }) {
  const { item, limit, guide, level, ppt } = row;
  const tone = TONE[level];

  // The line drawn on the bar: EPA limit, health guideline, or the
  // total-PFAS objective (compared against this system's total).
  let bench = null;
  if (limit) bench = { value: ppt, line: limit.mclPpt, label: `EPA limit ${limit.mclPpt} ppt` };
  else if (guide) bench = { value: ppt, line: guide.ppt, label: `Health guideline ${guide.ppt.toLocaleString("en-US")} ppt` };
  else if (level === "groupOnly" && total && totalPpt !== null)
    bench = { value: totalPpt, line: total.ppt, label: `Total-PFAS guideline ${total.ppt} ppt` };

  let fill = 0;
  let marker = null;
  let caption = "";

  if (bench) {
    const scaleMax = Math.max(bench.value, bench.line) * 1.3;
    fill = (bench.value / scaleMax) * 100;
    marker = (bench.line / scaleMax) * 100;
    if (level === "groupOnly") {
      caption = `Bar shows this system's total PFAS (${totalPpt} ppt), which includes ${item.contaminant}.`;
    }
  } else if (stat && stat.max > 0) {
    const maxPpt = toPpt(stat.max);
    fill = Math.min(100, (ppt / maxPpt) * 100);
    caption = `Bar compares this result with the highest North Carolina result for ${item.contaminant} (${maxPpt} ppt).`;
  }

  const date = formatDate(item.maxDate);
  let sentence;
  if (level === "atOrAbove") {
    const ratio = ppt / limit.mclPpt;
    const how = ratio < 1.05 ? "right at" : `about ${ratio.toFixed(1)} times`;
    sentence = `The highest sample (${date}) was ${ppt} ppt, ${how} EPA's ${limit.mclPpt} ppt limit.`;
  } else if (level === "below") {
    sentence = `The highest sample (${date}) was ${ppt} ppt, under EPA's ${limit.mclPpt} ppt limit.`;
  } else if (level === "guideAbove" || level === "guideBelow") {
    const where = level === "guideAbove" ? "at or above" : "under";
    sentence = `The highest sample (${date}) was ${ppt} ppt, ${where} the ${guide.source}'s health-based guideline of ${guide.ppt.toLocaleString("en-US")} ppt.`;
  } else if (level === "groupOnly" && total) {
    sentence = `The highest sample (${date}) was ${ppt} ppt. Health agencies have not set a guideline for ${item.contaminant} by itself, so it is judged as part of the total: ${total.source} recommends keeping 25 PFAS combined below ${total.ppt} ppt, and this system's total is about ${totalPpt} ppt.`;
  } else {
    sentence = `The highest sample (${date}) was ${ppt} ppt.`;
  }

  let ncLine = "";
  if (stat && stat.tested > 0) {
    const raw = (stat.detected / stat.tested) * 100;
    const pct = raw > 0 && raw < 1 ? "<1" : Math.round(raw);
    ncLine = ` Across North Carolina, ${item.contaminant} was found in ${stat.detected} of ${stat.tested} water systems (${pct}%).`;
  }

  return (
    <div className={`finding ${tone}`}>
      <div className="finding-top">
        <div>
          <strong className="finding-name">{item.contaminant}</strong>
          {fullName && <span className="note">{fullName}</span>}
        </div>
        <span className={`pill ${tone}`}>{PILL_TEXT[level]}</span>
      </div>

      <p className="finding-number">
        {ppt} <span>ppt</span>
        <em>
          ({item.maxValue} {units})
        </em>
      </p>

      <div
        className="meter"
        role="img"
        aria-label={`${item.contaminant}: ${ppt} ppt${
          bench ? `, ${bench.label}` : ""
        }`}
      >
        <div
          className={`meter-fill ${tone}`}
          style={{ width: `${Math.max(2, fill)}%` }}
        />
        {marker !== null && (
          <div className="meter-limit" style={{ left: `${marker}%` }}>
            <span>{bench.label}</span>
          </div>
        )}
      </div>

      {caption && <p className="note">{caption}</p>}
      <p>{sentence}</p>
      {guide && (
        <p className="note">
          A health-based guideline is a level a health agency recommends
          staying below. It is not a legal limit.
        </p>
      )}
      {limit && limit.proposedForRemoval && (
        <p className="note">
          EPA has proposed removing this limit. {limit.note}
        </p>
      )}
      <p className="note">
        Found in {item.detections} of {item.samples} samples from this system.
        {ncLine}
      </p>
    </div>
  );
}

export default function Findings({ system, units, allSystems, clusters }) {
  const [limitData, setLimitData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLimits()
      .then((data) => {
        if (!cancelled) setLimitData(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const result = {};
    const entry = (name) =>
      result[name] || (result[name] = { tested: 0, detected: 0, max: 0 });
    allSystems.forEach((s) => {
      s.notDetected.forEach((n) => {
        entry(n.contaminant).tested += 1;
      });
      s.detected.forEach((d) => {
        const st = entry(d.contaminant);
        st.tested += 1;
        st.detected += 1;
        if (d.maxValue > st.max) st.max = d.maxValue;
      });
    });
    return result;
  }, [allSystems]);

  if (!limitData && !failed) {
    return <p className="note">Loading EPA reference levels…</p>;
  }

  const haveLimits = Boolean(limitData);
  const limits = limitData ? limitData.limits : {};
  const guides = (limitData && limitData.guidelines) || {};
  const total = (limitData && limitData.totalPfas) || null;
  const tested = system.detected.length + system.notDetected.length;

  const rows = system.detected
    .map((item) => {
      const limit = limits[item.contaminant];
      const guide = limit ? null : guides[item.contaminant] || null;
      return { item, limit, guide, ...classify(item, limit, guide, haveLimits) };
    })
    .sort((a, b) => RANK[a.level] - RANK[b.level] || b.ppt - a.ppt);
  const totalPpt = haveLimits ? totalPfas(rows, total) : null;

  return (
    <>
      <Summary
        rows={rows}
        tested={tested}
        haveLimits={haveLimits}
        total={total}
        totalPpt={totalPpt}
      />

      {rows.length > 0 && (
        <>
          <h4>Chemicals found in this system</h4>
          <p className="note">
            Green means below an EPA limit or health-based guideline, and
            orange means at or above one. Gray means the chemical has no
            guideline of its own and is judged as part of the total PFAS.
          </p>
          {rows.map((row) => (
            <ChemicalCard
              key={row.item.contaminant}
              row={row}
              stat={stats[row.item.contaminant]}
              units={units}
              total={total}
              totalPpt={totalPpt}
              fullName={
                clusters && clusters[row.item.contaminant]
                  ? clusters[row.item.contaminant].fullName
                  : ""
              }
            />
          ))}
        </>
      )}

      {failed && (
        <p className="note">
          The file public/data/epa_limits.json could not be loaded.
        </p>
      )}

      <Explainer
        asOf={limitData ? limitData.asOf : "an earlier date"}
        sourceUrl={
          limitData
            ? limitData.sourceUrl
            : "https://www.epa.gov/sdwa/and-polyfluoroalkyl-substances-pfas"
        }
      />
    </>
  );
}