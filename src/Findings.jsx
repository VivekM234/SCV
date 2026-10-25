import { useMemo } from "react";

function toPpt(microgramsPerLiter) {
  return Number((microgramsPerLiter * 1000).toPrecision(3));
}

function formatDate(iso) {
  if (!iso) return "date not reported";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function classify(item, limit, haveLimits) {
  const ppt = toPpt(item.maxValue);
  if (!haveLimits) return { level: "unknown", ppt };
  if (!limit) return { level: "nolimit", ppt };
  return { level: ppt >= limit.mclPpt ? "atOrAbove" : "below", ppt };
}

const PILL_TEXT = {
  below: "Below EPA limit",
  atOrAbove: "At or above EPA limit",
  nolimit: "No federal limit set",
  unknown: "Limit unavailable",
};

const RANK = { atOrAbove: 0, below: 1, nolimit: 2, unknown: 3 };

function Summary({ rows, tested, haveLimits }) {
  const over = rows.filter((r) => r.level === "atOrAbove");
  const compared = rows.filter(
    (r) => r.level === "below" || r.level === "atOrAbove"
  );
  const noLimit = rows.filter((r) => r.level === "nolimit");

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
      "EPA's reference limits could not be loaded, so these results are not compared with them below.";
  } else if (over.length > 0) {
    tone = "alert";
    const names = new Intl.ListFormat("en", {
      style: "long",
      type: "conjunction",
    }).format(over.map((r) => r.item.contaminant));
    headline = `In at least one sample, ${names} ${
      over.length > 1 ? "were" : "was"
    } at or above EPA's legal limit.`;
    detail =
      "That is worth a closer look below and in your water utility's own water quality report. It is not a finding that the utility broke a rule: these are individual samples, and EPA checks averages over time. This site cannot tell you whether water is safe to drink.";
  } else if (compared.length > 0) {
    headline =
      "PFAS were found, but every result that has an EPA limit was under it.";
    detail = `${rows.length} of ${tested} PFAS were found. Under the limit is not the same as none.${
      noLimit.length > 0
        ? ` ${noLimit.length} of the PFAS found have no federal limit to compare with.`
        : ""
    }`;
  } else {
    tone = "neutral";
    headline =
      "PFAS were found, but EPA has no drinking-water limit for any of them.";
    detail = `${rows.length} of ${tested} PFAS were found. With no legal limit to compare against, this page can show how much was found and how that compares with other North Carolina systems, but not whether the amount matters.`;
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
          <strong>{haveLimits ? over.length : "–"}</strong>
          <span>at or above an EPA limit</span>
        </div>
      </div>
    </div>
  );
}

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
          <strong>No limit does not mean safe.</strong> Most PFAS have no
          federal limit yet, so there is nothing official to compare them
          with.
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

function ChemicalCard({ row, stat, fullName, info }) {
  const { item, limit, level, ppt } = row;

  let fill = 0;
  let marker = null;
  let caption = "";

  if (level === "below" || level === "atOrAbove") {
    const scaleMax = Math.max(ppt, limit.mclPpt) * 1.3;
    fill = (ppt / scaleMax) * 100;
    marker = (limit.mclPpt / scaleMax) * 100;
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
  } else if (level === "nolimit") {
    sentence = `The highest sample (${date}) was ${ppt} ppt. EPA has not set a drinking-water limit for ${item.contaminant}, so there is no legal line to compare this with.`;
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
    <div className={`finding ${level}`}>
      <div className="finding-top">
        <div>
          <strong className="finding-name">{item.contaminant}</strong>
          {fullName && <span className="note">{fullName}</span>}
        </div>
        <span className={`pill ${level}`}>{PILL_TEXT[level]}</span>
      </div>

      <p className="finding-number">
        {ppt} <span>ppt</span>
        <em>({item.maxValue} µg/L)</em>
      </p>

      <div
        className="meter"
        role="img"
        aria-label={`${item.contaminant}: ${ppt} ppt${
          limit ? `, EPA limit ${limit.mclPpt} ppt` : ""
        }`}
      >
        <div
          className={`meter-fill ${level}`}
          style={{ width: `${Math.max(2, fill)}%` }}
        />
        {marker !== null && (
          <div className="meter-limit" style={{ left: `${marker}%` }}>
            <span>EPA limit {limit.mclPpt} ppt</span>
          </div>
        )}
      </div>

      {caption && <p className="note">{caption}</p>}
      <p>{sentence}</p>
      {limit && limit.proposedForRemoval && (
        <p className="note">
          EPA has proposed removing this limit. {limit.note}
        </p>
      )}
      <p className="note">
        Found in {item.detections} of {item.samples} samples from this system.
        {ncLine}
      </p>

      {info && (
        <details className="chem-more">
          <summary>
            Where {item.contaminant} comes from and what it can do to health
          </summary>
          <p className="chem-label">How it gets into NC water</p>
          <p>{info.source}</p>
          <p className="chem-label">Allowed level</p>
          <p>{info.limit}</p>
          <p className="chem-label">Health concerns</p>
          <p>{info.health}</p>
        </details>
      )}
    </div>
  );
}

export default function Findings({
  system,
  allSystems,
  clusters,
  limitData,
  limitsFailed,
  chemInfo,
}) {
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

  if (!limitData && !limitsFailed) {
    return <p className="note">Loading EPA reference levels…</p>;
  }

  const haveLimits = Boolean(limitData);
  const limits = limitData ? limitData.limits : {};
  const tested = system.detected.length + system.notDetected.length;

  const rows = system.detected
    .map((item) => {
      const limit = limits[item.contaminant];
      return { item, limit, ...classify(item, limit, haveLimits) };
    })
    .sort((a, b) => RANK[a.level] - RANK[b.level] || b.ppt - a.ppt);

  return (
    <>
      <Summary rows={rows} tested={tested} haveLimits={haveLimits} />

      {rows.length > 0 && (
        <>
          <h4>Chemicals found in this system</h4>
          <p className="note">
            Green means below an EPA limit, orange means at or above one, and
            gray means EPA has no limit for that chemical. Open a card&rsquo;s
            details to see where the chemical comes from and its health
            concerns.
          </p>
          {rows.map((row) => (
            <ChemicalCard
              key={row.item.contaminant}
              row={row}
              stat={stats[row.item.contaminant]}
              info={chemInfo ? chemInfo[row.item.contaminant] : null}
              fullName={
                clusters && clusters[row.item.contaminant]
                  ? clusters[row.item.contaminant].fullName
                  : ""
              }
            />
          ))}
        </>
      )}

      {limitsFailed && (
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
