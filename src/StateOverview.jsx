import { useMemo, useState } from "react";
import "./StateOverview.css";

function toPpt(microgramsPerLiter) {
  return Number((microgramsPerLiter * 1000).toPrecision(3));
}

function fmt(v) {
  if (v == null || v === 0) return "–";
  return v >= 100 ? Math.round(v).toLocaleString("en-US") : String(v);
}

const TABLE_COLS = [
  { key: "name", label: "Water system", text: true },
  { key: "count", label: "PFAS found" },
  { key: "PFOA", label: "PFOA (ppt)", chem: true },
  { key: "PFOS", label: "PFOS (ppt)", chem: true },
  { key: "PFHxS", label: "PFHxS (ppt)", chem: true },
  { key: "HFPO-DA", label: "GenX (ppt)", chem: true },
];

function StatTile({ value, label }) {
  return (
    <div className="ov-tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function DetectionChart({ chems }) {
  const shown = chems.filter((c) => c.detected > 0);
  const top = Math.max(1, ...shown.map((c) => c.detected));
  return (
    <div className="ov-card">
      <p className="note">
        Each bar is the number of North Carolina water systems where the
        chemical was found at least once. The orange part is how many of those
        had a sample at or above EPA&rsquo;s limit. Chemicals never found in
        NC aren&rsquo;t shown.
      </p>
      <div className="ov-chart">
        {shown.map((c) => (
          <div
            className="ov-bar-row"
            key={c.name}
            title={`${c.name}: found in ${c.detected} of ${c.tested} systems${
              c.limit ? `, ${c.atOrAbove} at or above the ${c.limit} ppt limit` : ""
            }. Highest result ${fmt(c.max)} ppt.`}
          >
            <span className="ov-bar-label">{c.name}</span>
            <div className="ov-bar-track">
              <div
                className="ov-bar-fill"
                style={{ width: `${(c.detected / top) * 70}%` }}
              >
                {c.atOrAbove > 0 && (
                  <div
                    className="ov-bar-over"
                    style={{ width: `${(c.atOrAbove / c.detected) * 100}%` }}
                  />
                )}
              </div>
              <span className="ov-bar-value">
                {c.detected}
                {c.atOrAbove > 0 ? ` (${c.atOrAbove} at/above limit)` : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="ov-legend">
        <span>
          <i className="ov-sw found" />
          Found, under the limit or no limit exists
        </span>
        <span>
          <i className="ov-sw over" />
          At or above EPA&rsquo;s limit in at least one sample
        </span>
      </div>
    </div>
  );
}

function ReferenceCard({ c, info, fullName, onOpenSystem, displayName }) {
  return (
    <details className="ov-ref">
      <summary>
        <span className="ov-ref-name">{c.name}</span>
        {fullName && <span className="note"> · {fullName}</span>}
        <span className="ov-ref-line">
          Found in {c.detected} of {c.tested} NC systems · highest{" "}
          {fmt(c.max)} ppt
          {c.limit ? ` · EPA limit ${c.limit} ppt` : " · no federal limit"}
        </span>
      </summary>
      <div className="ov-ref-body">
        {c.limit && (
          <p className={c.atOrAbove > 0 ? "ov-flag" : "note"}>
            {c.atOrAbove} system{c.atOrAbove === 1 ? "" : "s"} had at least
            one sample at or above the limit.
          </p>
        )}
        {c.maxSystem && (
          <p className="note">
            Highest result:{" "}
            <button
              type="button"
              className="ov-link"
              onClick={() => onOpenSystem(c.maxSystem)}
            >
              {displayName(c.maxSystem.name)}
            </button>
          </p>
        )}
        {info ? (
          <>
            <p className="chem-label">How it gets into NC water</p>
            <p>{info.source}</p>
            <p className="chem-label">Allowed level</p>
            <p>{info.limit}</p>
            <p className="chem-label">Health concerns</p>
            <p>{info.health}</p>
          </>
        ) : (
          <p className="note">No reference notes are available yet.</p>
        )}
      </div>
    </details>
  );
}

function SystemsTable({ rows, limits, onOpenSystem }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "PFOS", dir: "desc" });

  const value = (r, key) => (key === "name" ? r.name : key === "count" ? r.count : r.maxBy[key] || 0);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.system.id.toLowerCase().includes(q) ||
        r.system.zips.some((z) => z.startsWith(q))
    );
    const sign = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      const x = value(a, sort.key);
      const y = value(b, sort.key);
      return (x < y ? -1 : x > y ? 1 : 0) * sign;
    });
  }, [rows, query, sort]);

  function toggle(key) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "desc" ? "asc" : "desc" }
        : { key, dir: key === "name" ? "asc" : "desc" }
    );
  }

  return (
    <div className="ov-card">
      <input
        className="ov-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter by name, ID or ZIP"
        aria-label="Filter water systems"
      />
      <p className="note">
        {shown.length} of {rows.length} systems. Click a column to sort and a
        system to see its full results. Orange numbers are at or above EPA&rsquo;s
        limit.
      </p>
      <div className="ov-table-wrap">
        <table className="ov-table">
          <thead>
            <tr>
              {TABLE_COLS.map((col) => (
                <th
                  key={col.key}
                  className={col.text ? "text" : ""}
                  aria-sort={
                    sort.key === col.key
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button type="button" onClick={() => toggle(col.key)}>
                    {col.label}
                    {sort.key === col.key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.system.id}>
                <td className="text">
                  <button
                    type="button"
                    className="ov-link"
                    onClick={() => onOpenSystem(r.system)}
                  >
                    {r.name}
                  </button>
                  <span className="note"> {r.system.id}</span>
                </td>
                <td>{r.count || "–"}</td>
                {TABLE_COLS.filter((c) => c.chem).map((col) => {
                  const v = r.maxBy[col.key] || 0;
                  const lim = limits[col.key];
                  const over = lim && v >= lim.mclPpt;
                  return (
                    <td key={col.key} className={over ? "over" : v ? "" : "nd"}>
                      {fmt(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StateOverview({
  data,
  limitData,
  chemInfo,
  clusters,
  onOpenSystem,
  displayName,
}) {
  const limits = limitData ? limitData.limits : {};

  const stats = useMemo(() => {
    const chem = {};
    const entry = (name) =>
      chem[name] ||
      (chem[name] = {
        name,
        tested: 0,
        detected: 0,
        atOrAbove: 0,
        max: 0,
        maxSystem: null,
        limit: limits[name] ? limits[name].mclPpt : null,
      });

    const overIds = new Set();
    let anyDetect = 0;

    const rows = data.systems.map((s) => {
      const maxBy = {};
      let flagged = false;
      s.notDetected.forEach((n) => {
        entry(n.contaminant).tested += 1;
      });
      s.detected.forEach((d) => {
        const e = entry(d.contaminant);
        const p = toPpt(d.maxValue);
        e.tested += 1;
        e.detected += 1;
        maxBy[d.contaminant] = p;
        if (p > e.max) {
          e.max = p;
          e.maxSystem = s;
        }
        if (e.limit && p >= e.limit) {
          e.atOrAbove += 1;
          flagged = true;
        }
      });
      if (s.detected.length) anyDetect += 1;
      if (flagged) overIds.add(s.id);
      return { system: s, name: displayName(s.name), count: s.detected.length, maxBy };
    });

    const allZips = new Set();
    const overZips = new Set();
    data.systems.forEach((s) =>
      s.zips.forEach((z) => {
        allZips.add(z);
        if (overIds.has(s.id)) overZips.add(z);
      })
    );

    const chems = Object.values(chem).sort(
      (a, b) => b.detected - a.detected || a.name.localeCompare(b.name)
    );
    return {
      rows,
      chems,
      anyDetect,
      overCount: overIds.size,
      zipsTotal: allZips.size,
      zipsOver: overZips.size,
    };
  }, [data, limits, displayName]);

  const found = stats.chems.filter((c) => c.detected > 0);
  const neverFound = stats.chems.filter((c) => c.detected === 0);
  const fullName = (n) => (clusters && clusters[n] ? clusters[n].fullName : "");
  const haveLimits = Boolean(limitData);

  return (
    <section className="overview" id="nc-overview">
      <p className="eyebrow">STATEWIDE</p>
      <h2>North Carolina at a glance</h2>
      <p className="ov-lede">
        Of the {data.systemCount} North Carolina water systems EPA tested in
        2023&ndash;2025, {stats.anyDetect} had at least one PFAS found
        {haveLimits
          ? `, and ${stats.overCount} had at least one sample at or above a federal PFAS limit (mostly the 4 ppt limits for PFOA and PFOS). Those systems serve parts of ${stats.zipsOver} of the ${stats.zipsTotal} ZIP codes in the data.`
          : "."}
      </p>

      <div className="ov-tiles">
        <StatTile value={data.systemCount} label="NC water systems tested" />
        <StatTile value={stats.anyDetect} label="had at least one PFAS found" />
        <StatTile
          value={haveLimits ? stats.overCount : "–"}
          label="had a sample at or above an EPA limit"
        />
        <StatTile
          value={haveLimits ? stats.zipsOver : "–"}
          label={`of ${stats.zipsTotal} ZIP codes served by one of those systems`}
        />
      </div>

      <h3>Which chemicals turned up, and how often</h3>
      <DetectionChart chems={stats.chems} />

      <h3>Each chemical: where it comes from, the limit, and health concerns</h3>
      <p className="note">Click a chemical to open its notes.</p>
      <div className="ov-refs">
        {found.map((c) => (
          <ReferenceCard
            key={c.name}
            c={c}
            info={chemInfo ? chemInfo[c.name] : null}
            fullName={fullName(c.name)}
            onOpenSystem={onOpenSystem}
            displayName={displayName}
          />
        ))}
      </div>

      {neverFound.length > 0 && (
        <>
          <h3>Tested for but never found in NC</h3>
          <div className="ov-card ov-table-wrap">
            <table className="ov-table ov-nd">
              <thead>
                <tr>
                  <th className="text">Chemical</th>
                  <th className="text">Notes</th>
                </tr>
              </thead>
              <tbody>
                {neverFound.map((c) => (
                  <tr key={c.name}>
                    <td className="text">
                      <strong>{c.name}</strong>
                      <br />
                      <span className="note">{fullName(c.name)}</span>
                    </td>
                    <td className="text">
                      {chemInfo && chemInfo[c.name]
                        ? chemInfo[c.name].source
                        : "Not found in any NC system tested."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3>All NC water systems tested</h3>
      <SystemsTable rows={stats.rows} limits={limits} onOpenSystem={onOpenSystem} />

      <div className="callout">
        These counts use the single highest sample from each system. EPA judges
        whether a utility meets its limits using yearly averages at each well
        or treatment plant, so fewer systems would actually be out of
        compliance than are flagged here. Samples were taken 2023&ndash;2025;
        systems that added treatment since then may test lower now. UCMR 5 also
        tested for lithium, which is not a PFAS and is not shown on this site.
      </div>
    </section>
  );
}
