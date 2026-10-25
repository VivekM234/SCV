import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import PfasPage from "./PfasPage.jsx";
import {
  EPA_DATA_FINDER,
  EPA_OCCURRENCE,
  Molecule3D,
  SystemDetail,
} from "./Chemistry.jsx";
import {
  STATUS_LABEL,
  displayName,
  formatDate,
  loadLimits,
  resultFor,
  structureUrl,
  systemStatus,
  toPpt,
} from "./lib.js";

const DATA_URL = "/data/nc_pfas.json";
const CLUSTER_URL = "/data/pfas_clusters.json";

// Plain-English nicknames for compounds that have one.
const ALIAS = { "HFPO-DA": "GenX" };
const FALLBACK_DECODER = ["PFOA", "PFOS", "HFPO-DA", "PFHxS", "PFNA"];
const TABLE_STEP = 25;

const ROUTES = {
  "#/pfas": "pfas",
  "#/chemistry": "chemistry",
  "#/scale": "scale",
  "#/directory": "directory",
};

const TITLES = {
  home: "PFAS Decoder | North Carolina drinking water",
  pfas: "What are PFAS? | PFAS Decoder",
  chemistry: "Chemistry | PFAS Decoder",
  scale: "PPT Scale | PFAS Decoder",
  directory: "Water System Directory | PFAS Decoder",
};

function routeFromHash() {
  return ROUTES[window.location.hash] || "home";
}

function fetchJson(url) {
  return fetch(url).then((response) => {
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  });
}

/* ---------- Header and footer ---------- */

const NAV = [
  ["#home", "// [01] SEARCH", "home"],
  ["#/chemistry", "// [02] CHEMISTRY", "chemistry"],
  ["#/scale", "// [03] PPT SCALE", "scale"],
  ["#/directory", "// [04] DIRECTORY", "directory"],
  ["#/pfas", "// WHAT ARE PFAS", "pfas"],
];

function SiteHeader({ route }) {
  return (
    <header className="site-header">
      <div className="wrap site-header-inner">
        <div className="site-header-left">
          <a className="brand" href="#home">
            <span className="brand-badge">NC</span>
            <span>PFAS DECODER</span>
          </a>
          <span className="header-tag">
            [SCV PROJECT // CONGRESSIONAL APP CHALLENGE]
          </span>
        </div>
        <nav className="nav-links" aria-label="Main">
          {NAV.map(([href, label, key]) => (
            <a
              key={key}
              href={href}
              aria-current={route === key ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <span className="header-badge">EPA UCMR 5 DATA</span>
      </div>
    </header>
  );
}

function SiteFooter({ source }) {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <span className="tag tag-light">
              [CONGRESSIONAL APP CHALLENGE // SCV PROJECT]
            </span>
            <h2>
              BE BOLD.
              <br />
              BUILD WISELY.
            </h2>
          </div>
          <div className="footer-meta">
            <p>// DATASET: {source || "U.S. EPA UCMR 5"}</p>
            <p>// THIS SITE IS NOT A SAFETY DETERMINATION OR MEDICAL ADVICE</p>
            <p>
              //{" "}
              <a href={EPA_OCCURRENCE} target="_blank" rel="noreferrer">
                EPA OCCURRENCE DATA ↗
              </a>{" "}
              ·{" "}
              <a href={EPA_DATA_FINDER} target="_blank" rel="noreferrer">
                EPA DATA FINDER ↗
              </a>
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>PFAS DECODER NC</span>
          <nav aria-label="Footer">
            <a href="#home">SEARCH</a>
            <a href="#/chemistry">CHEMISTRY</a>
            <a href="#/scale">PPT SCALE</a>
            <a href="#/directory">DIRECTORY</a>
            <a href="#/pfas">WHAT ARE PFAS</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Chemistry decoder ---------- */

function Decoder({ names, clusters, limits, stats }) {
  const [active, setActive] = useState("PFOA");
  const info = clusters ? clusters[active] : null;
  const limit = limits ? limits[active] : null;
  const stat = stats[active];

  if (!info) {
    return (
      <p className="note">
        Compound details could not be loaded. Check that
        public/data/pfas_clusters.json exists.
      </p>
    );
  }

  const similar = info.mostSimilar.slice(0, 3);

  return (
    <>
      <div className="chem-tabs" role="tablist" aria-label="Compound">
        {names.map((name, i) => {
          const c = clusters[name];
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={name === active}
              className={name === active ? "chem-tab active" : "chem-tab"}
              onClick={() => setActive(name)}
            >
              <span className="chem-index">
                [COMPOUND {String(i + 1).padStart(2, "0")}]
              </span>
              <strong>{ALIAS[name] || name}</strong>
              <span className="chem-full">{c.fullName}</span>
            </button>
          );
        })}
      </div>

      <div className="panel chem-panel">
        <div className="chem-main">
          <div className="chip-row">
            <span className="tag">{info.family.toUpperCase()}</span>
            <span className="tag tag-line">{info.formula}</span>
            {ALIAS[active] && (
              <span className="tag tag-line">ALSO CALLED {ALIAS[active]}</span>
            )}
          </div>
          <h3>
            {active}
            <span> ({info.fullName})</span>
          </h3>

          <p className="body-text">
            {stat && stat.tested > 0
              ? `In the EPA data, ${active} was found in ${stat.detected} of ${stat.tested} North Carolina water systems tested.`
              : `${active} is one of the PFAS tested for in EPA's fifth Unregulated Contaminant Monitoring Rule.`}
            {stat && stat.detected > 0 && stat.maxSystem
              ? ` The highest single sample was ${toPpt(stat.max)} ppt, at ${displayName(
                  stat.maxSystem.name
                )} on ${formatDate(stat.maxDate)}.`
              : ""}
          </p>

          <div className="fact-grid">
            <div className="fact">
              <span className="fact-label">EPA DRINKING-WATER LIMIT</span>
              <span className="fact-value">
                {limit
                  ? `${limit.mclPpt} parts per trillion`
                  : "None set by EPA"}
              </span>
              {limit && limit.proposedForRemoval && (
                <span className="fact-note">
                  EPA has proposed removing this limit. {limit.note}
                </span>
              )}
            </div>
            <div className="fact">
              <span className="fact-label">MOST SIMILAR STRUCTURES</span>
              <span className="fact-value">
                {similar.map((s) => s.name).join(", ") || "—"}
              </span>
              <span className="fact-note">
                Similarity to PFOA {info.similarityToPFOA.toFixed(2)} · to PFOS{" "}
                {info.similarityToPFOS.toFixed(2)} (scale of 0 to 1).
                Similar structure does not prove similar toxicity.
              </span>
            </div>
          </div>
        </div>

        <div className="chem-side">
          <h4 className="mini-head">[STRUCTURE]</h4>
          <img
            className="structure-img"
            src={structureUrl(active)}
            alt={`Structure of ${info.fullName}`}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <h4 className="mini-head">[REDUCING PFAS IN WATER]</h4>
          <p className="note">
            EPA lists granular activated carbon, ion exchange resins, and
            reverse osmosis or nanofiltration as technologies that can reduce
            PFAS. What works for a home depends on the product, so look for
            filters independently certified to reduce PFAS.
          </p>
        </div>
      </div>

      <div className="panel panel-flush">
        <Molecule3D info={info} />
      </div>
    </>
  );
}

/* ---------- Parts-per-trillion scale ---------- */

function PptScale({ limits, systemMaxes }) {
  const [value, setValue] = useState(4);
  const rows = limits
    ? Object.entries(limits).map(([name, l]) => ({ name, limit: l }))
    : [];

  const atOrAbove = systemMaxes.filter((m) => m >= value).length;
  const showCount = systemMaxes.length > 0 && value > 0;

  return (
    <div className="panel">
      <p className="mono-note">
        Move the slider to pick a concentration, then see how it compares with
        EPA&rsquo;s limits and with what was measured in North Carolina.
      </p>

      <div className="slider-head">
        <span>CONCENTRATION LEVEL:</span>
        <output className="slider-value">{value.toFixed(1)} ppt</output>
      </div>
      <input
        className="slider"
        type="range"
        min="0"
        max="50"
        step="0.5"
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        aria-label="Concentration in parts per trillion"
      />
      <div className="slider-scale" aria-hidden="true">
        <span>0</span>
        <span>4 ppt</span>
        <span>10 ppt</span>
        <span>25 ppt</span>
        <span>50 ppt</span>
      </div>

      <div className="feedback">
        <p className="feedback-head">
          {value === 0
            ? "[ NOTHING AT THIS LEVEL ]"
            : `[ ${value.toFixed(1)} PPT — ABOUT ${
                value === 1 ? "1 DROP" : `${Number(value.toPrecision(3))} DROPS`
              } IN 20 OLYMPIC POOLS ]`}
        </p>

        {rows.length > 0 ? (
          <ul className="compare-list">
            {rows.map(({ name, limit }) => (
              <li key={name}>
                <span>{ALIAS[name] ? `${name} (${ALIAS[name]})` : name}</span>
                <span>EPA limit {limit.mclPpt} ppt</span>
                <strong
                  className={value >= limit.mclPpt ? "state-over" : "state-under"}
                >
                  {value >= limit.mclPpt ? "AT OR ABOVE" : "BELOW"}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="note">EPA limits could not be loaded.</p>
        )}

        {showCount && (
          <p className="body-text">
            In the EPA data, {atOrAbove} of {systemMaxes.length} North
            Carolina water systems had at least one single sample at or above{" "}
            {value.toFixed(1)} ppt. These are individual samples, not a
            finding that a system broke a rule.
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------- Directory table ---------- */

function Directory({ systems, limits, onInspect }) {
  const [filter, setFilter] = useState("");
  const [shown, setShown] = useState(TABLE_STEP);

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = [...systems].sort((a, b) =>
      displayName(a.name).localeCompare(displayName(b.name))
    );
    if (!q) return list;
    return list.filter(
      (s) =>
        s.zips.some((z) => z.includes(q)) ||
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [systems, filter]);

  const visible = rows.slice(0, shown);

  return (
    <>
      <div className="table-tools">
        <input
          className="field"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setShown(TABLE_STEP);
          }}
          placeholder="Filter by ZIP, town, or PWSID..."
          aria-label="Filter water systems"
        />
        <span className="mono-note">
          SHOWING {visible.length} OF {rows.length}
        </span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ZIP CODES SERVED</th>
              <th>WATER SYSTEM</th>
              <th>PWSID</th>
              <th>PFOA (PPT)</th>
              <th>PFOS (PPT)</th>
              <th>GENX (PPT)</th>
              <th>HIGHEST SAMPLE VS EPA LIMIT</th>
              <th>
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => {
              const status = systemStatus(s, limits);
              return (
                <tr key={s.id}>
                  <td className="cell-zip">
                    {s.zips.slice(0, 3).join(", ") || "—"}
                    {s.zips.length > 3 ? ` +${s.zips.length - 3}` : ""}
                  </td>
                  <td className="cell-name">{displayName(s.name)}</td>
                  <td className="cell-id">{s.id}</td>
                  <td>{resultFor(s, "PFOA")}</td>
                  <td>{resultFor(s, "PFOS")}</td>
                  <td>{resultFor(s, "HFPO-DA")}</td>
                  <td>
                    <span className={`badge badge-${status}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-solid btn-small"
                      onClick={() => onInspect(s.id)}
                    >
                      INSPECT
                    </button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan="8" className="cell-empty">
                  NO WATER SYSTEM MATCHES &ldquo;{filter.toUpperCase()}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > shown && (
        <div className="table-more">
          <button
            type="button"
            className="btn-line"
            onClick={() => setShown(shown + TABLE_STEP)}
          >
            SHOW {Math.min(TABLE_STEP, rows.length - shown)} MORE
          </button>
          <button
            type="button"
            className="btn-line"
            onClick={() => setShown(rows.length)}
          >
            SHOW ALL {rows.length}
          </button>
        </div>
      )}

      <p className="mono-note table-footnote">
        ND = NOT DETECTED AT OR ABOVE THE REPORTING LEVEL · — = NO RESULT IN
        THIS DATASET · THE LAST COLUMN COMPARES THE HIGHEST SINGLE SAMPLE WITH
        EPA&rsquo;S LIMITS. EPA CHECKS COMPLIANCE USING AVERAGES OVER TIME, SO
        THIS IS NOT A COMPLIANCE FINDING.
      </p>
    </>
  );
}

/* ---------- Inspect modal ---------- */

function InspectModal({ children, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (previous && previous.focus) previous.focus();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Water system report"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="btn-solid modal-close"
          onClick={onClose}
        >
          CLOSE [X]
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------- App ---------- */

function App() {
  const [data, setData] = useState(null);
  const [clusterData, setClusterData] = useState(null);
  const [limitData, setLimitData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [matches, setMatches] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [inspectId, setInspectId] = useState(null);
  const resultsRef = useRef(null);
  const [route, setRoute] = useState(routeFromHash);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.title = TITLES[route];
    const id = window.location.hash.replace("#", "");
    if (route === "home" && id && id !== "home") {
      document.getElementById(id)?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [route]);

  useEffect(() => {
    if (matches === null || !resultsRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [matches]);

  useEffect(() => {
    fetchJson(DATA_URL)
      .then(setData)
      .catch(() => setLoadError(true));
    fetchJson(CLUSTER_URL)
      .then(setClusterData)
      .catch(() => setClusterData(null));
    loadLimits()
      .then(setLimitData)
      .catch(() => setLimitData(null));
  }, []);

  const clusters = useMemo(() => {
    if (!clusterData) return null;
    return Object.fromEntries(clusterData.compounds.map((c) => [c.name, c]));
  }, [clusterData]);

  const limits = limitData ? limitData.limits : null;

  const derived = useMemo(() => {
    const names = new Set();
    const zips = new Set();
    const stats = {};
    const systemMaxes = [];
    const entry = (name) =>
      stats[name] || (stats[name] = { tested: 0, detected: 0, max: 0 });

    if (data) {
      data.systems.forEach((s) => {
        s.zips.forEach((z) => zips.add(z));
        s.notDetected.forEach((n) => {
          names.add(n.contaminant);
          entry(n.contaminant).tested += 1;
        });
        let top = 0;
        s.detected.forEach((d) => {
          names.add(d.contaminant);
          const st = entry(d.contaminant);
          st.tested += 1;
          st.detected += 1;
          if (d.maxValue > st.max) {
            st.max = d.maxValue;
            st.maxSystem = s;
            st.maxDate = d.maxDate;
          }
          if (d.maxValue > top) top = d.maxValue;
        });
        systemMaxes.push(toPpt(top));
      });
    }

    return {
      allContaminants: [...names].sort(),
      zipCount: zips.size,
      stats,
      systemMaxes,
    };
  }, [data]);

  const decoderNames = useMemo(() => {
    const source = limits ? Object.keys(limits) : FALLBACK_DECODER;
    return source.filter((n) => clusters && clusters[n]);
  }, [limits, clusters]);

  function runSearch(query) {
    if (!data) return;
    const q = query.trim();
    const lower = q.toLowerCase();
    const isZip = /^\d{5}$/.test(q);

    const found = data.systems.filter((s) =>
      isZip
        ? s.zips.includes(q)
        : s.name.toLowerCase().includes(lower) || s.id.toLowerCase() === lower
    );

    setSubmitted(q);
    setMatches(found);
    setSelectedId(found.length === 1 ? found[0].id : null);
  }

  function onSubmit(event) {
    event.preventDefault();
    runSearch(search);
  }

  const selected = matches ? matches.find((s) => s.id === selectedId) : null;
  const inspected =
    data && inspectId ? data.systems.find((s) => s.id === inspectId) : null;
  const disclaimer = clusterData ? clusterData.disclaimer : "";
  const pfoaLimit = limits && limits.PFOA ? limits.PFOA.mclPpt : null;

  const detailProps = data
    ? {
        units: data.units,
        allSystems: data.systems,
        allContaminants: derived.allContaminants,
        clusters,
        disclaimer,
      }
    : null;

  return (
    <>
      <SiteHeader route={route} />

      {route === "pfas" ? (
        <PfasPage />
      ) : (
        <main className="page">
          {route === "home" && (
            <>
          <section className="hero blueprint" id="home">
            <div className="wrap hero-inner">
              <div className="hero-copy">
              <span className="tag">[01 // NORTH CAROLINA DRINKING WATER]</span>
              <h1>
                YOUR WATER REPORT,
                <br />
                IN PLAIN ENGLISH.
              </h1>
              <p className="hero-lead">
                Search a ZIP code or water system.
              </p>

              <form className="search-bar" onSubmit={onSubmit}>
                <label htmlFor="water-search" className="sr-only">
                  ZIP code or water system
                </label>
                <input
                  id="water-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ZIP code or water system"
                  autoComplete="off"
                  required
                />
                <button type="submit" disabled={!data}>
                  RUN QUERY →
                </button>
              </form>

              <p className="mono-note hero-note">
                {loadError
                  ? "THE DATA FILE COULD NOT BE LOADED. CHECK THAT PUBLIC/DATA/NC_PFAS.JSON EXISTS."
                  : data
                  ? `DATA: ${data.source}.`
                  : "LOADING DATA…"}
              </p>
              </div>

              <figure className="scale">
                <svg
                  viewBox="0 0 400 400"
                  role="img"
                  aria-label="Ripples spreading from a single drop of water"
                >
                  <circle className="ring" cx="200" cy="200" r="190" />
                  <circle className="ring" cx="200" cy="200" r="190" />
                  <circle className="ring" cx="200" cy="200" r="190" />
                  <circle className="ring" cx="200" cy="200" r="190" />
                  <circle className="ring" cx="200" cy="200" r="190" />
                  <circle className="drop-glow" cx="200" cy="205" r="62" />
                  <path
                    className="drop"
                    d="M200 148C200 148 164 190 164 217a36 36 0 0 0 72 0c0-27-36-69-36-69z"
                  />
                  <path
                    className="drop-shine"
                    d="M182 214c0 9 4 17 11 21-6-9-7-20-4-31-4 3-7 6-7 10z"
                  />
                </svg>
                <figcaption>
                  <strong>One part per trillion</strong> is about one drop of
                  water in 20 Olympic-size swimming pools.
                </figcaption>
              </figure>
            </div>
          </section>

          {matches !== null && (
            <section className="results" ref={resultsRef} id="results">
              <div className="wrap">
                <span className="tag">[ QUERY RESULT: {matches.length} FOUND ]</span>
                <h2>Search results</h2>

                {matches.length === 0 && (
                  <div className="callout">
                    No UCMR 5 results found for &ldquo;{submitted}&rdquo;. That
                    does not mean the water is untested or safe. UCMR 5 did not
                    monitor every public water system, a ZIP code can be served
                    by systems not listed here, and private wells are not
                    covered.
                  </div>
                )}

                {matches.length > 1 && (
                  <div className="match-list">
                    <p>{matches.length} water systems match. Select one:</p>
                    {matches.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        className={s.id === selectedId ? "match active" : "match"}
                        onClick={() => setSelectedId(s.id)}
                      >
                        {displayName(s.name)} <span>{s.id}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selected && (
                  <SystemDetail key={selected.id} system={selected} {...detailProps} />
                )}

                {matches.length > 0 && (
                  <div className="callout">
                    This page shows what was measured. It does not say whether
                    water is safe to drink.
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="metrics" id="metrics-section">
            <div className="wrap metrics-grid">
              <div className="metric">
                <span className="metric-id">[SYS // 01]</span>
                <strong>
                  {data ? data.systemCount.toLocaleString("en-US") : "–"}
                </strong>
                <span className="metric-label">NC WATER SYSTEMS</span>
                <p>Systems with results in the EPA UCMR 5 dataset.</p>
              </div>
              <div className="metric">
                <span className="metric-id">[ZIP // 02]</span>
                <strong>
                  {data ? derived.zipCount.toLocaleString("en-US") : "–"}
                </strong>
                <span className="metric-label">ZIP CODES IN THE DATA</span>
                <p>
                  ZIP codes linked to a tested system. A ZIP code can be served
                  by systems not listed here.
                </p>
              </div>
              <div className="metric">
                <span className="metric-id">[CHEM // 03]</span>
                <strong>{data ? derived.allContaminants.length : "–"}</strong>
                <span className="metric-label">PFAS REPORTED</span>
                <p>
                  Different PFAS with results in this dataset, including PFOA,
                  PFOS, GenX (HFPO-DA), and PFHxS.
                </p>
              </div>
              <div className="metric">
                <span className="metric-id">[MCL // 04]</span>
                <strong>
                  {pfoaLimit !== null ? pfoaLimit : "–"} <small>ppt</small>
                </strong>
                <span className="metric-label">EPA LIMIT FOR PFOA AND PFOS</span>
                <p>
                  The highest amount EPA allows in public drinking water for
                  each.
                </p>
              </div>
            </div>
          </section>

            </>
          )}

          {route === "chemistry" && (
            <>
          <section className="block" id="decoder-section">
            <div className="wrap">
              <div className="block-head">
                <div>
                  <span className="tag">[02 // MOLECULAR DECODER]</span>
                  <h2>PFAS CHEMICAL BREAKDOWN</h2>
                </div>
                <p className="mono-note">
                  // SELECT A COMPOUND TO SEE ITS STRUCTURE, EPA LIMIT, AND NC
                  RESULTS
                </p>
              </div>
              <Decoder
                names={decoderNames}
                clusters={clusters}
                limits={limits}
                stats={derived.stats}
              />
            </div>
          </section>

            </>
          )}

          {route === "scale" && (
            <>
          <section className="block block-white" id="visualizer-section">
            <div className="wrap">
              <div className="block-head">
                <div>
                  <span className="tag">[03 // SCALE ENGINE]</span>
                  <h2>PARTS-PER-TRILLION VISUALIZER</h2>
                </div>
              </div>
              <PptScale limits={limits} systemMaxes={derived.systemMaxes} />
            </div>
          </section>

            </>
          )}

          {route === "directory" && (
            <>
          <section className="block" id="systems-table">
            <div className="wrap">
              <div className="block-head">
                <div>
                  <span className="tag">[04 // WATER SYSTEM DIRECTORY]</span>
                  <h2>
                    {data ? data.systemCount : ""} NORTH CAROLINA WATER SYSTEMS
                  </h2>
                </div>
              </div>
              {data ? (
                <Directory
                  systems={data.systems}
                  limits={limits}
                  onInspect={setInspectId}
                />
              ) : (
                <p className="mono-note">LOADING DATA…</p>
              )}
            </div>
          </section>

            </>
          )}
        </main>
      )}

      {inspected && (
        <InspectModal onClose={() => setInspectId(null)}>
          <SystemDetail system={inspected} {...detailProps} />
        </InspectModal>
      )}

      <SiteFooter source={data ? data.source : ""} />
    </>
  );
}

export default App;
