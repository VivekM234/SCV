import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import Findings from "./Findings.jsx";

const DATA_URL = "/data/nc_pfas.json";
const CLUSTER_URL = "/data/pfas_clusters.json";
const MOL_URL = "/data/pfas_3d.json";
const EPA_DATA_FINDER =
  "https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder";
const EPA_OCCURRENCE =
  "https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule";

const SMALL_WORDS = new Set(["of", "and", "the", "at", "for", "in"]);
const KEEP_UPPER = new Set(["NC", "II", "III", "IV", "US", "LLC", "INC"]);

const ELEMENT_STYLE = {
  C: { color: "#4a5a55", label: "Carbon" },
  F: { color: "#5cc27a", label: "Fluorine" },
  O: { color: "#d94c4c", label: "Oxygen" },
  S: { color: "#e3b72a", label: "Sulfur" },
  N: { color: "#3f6fd8", label: "Nitrogen" },
  Cl: { color: "#8a4fc9", label: "Chlorine" },
  H: { color: "#c9d1cd", label: "Hydrogen" },
};

function pptOf(microgramsPerLiter) {
  return Number((microgramsPerLiter * 1000).toPrecision(3));
}

let molPromise = null;
function loadMolecules() {
  if (!molPromise) {
    molPromise = fetch(MOL_URL)
      .then((response) => {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .catch((error) => {
        molPromise = null;
        throw error;
      });
  }
  return molPromise;
}

let libPromise = null;
function loadViewerLib() {
  if (!libPromise) {
    libPromise = import("3dmol")
      .then((lib) => (lib.createViewer ? lib : lib.default))
      .catch((error) => {
        libPromise = null;
        throw error;
      });
  }
  return libPromise;
}

function displayName(name) {
  const stripped = name
    .replace(/,\s*(TOWN|CITY|VILLAGE|COUNTY)\s+OF\s*$/i, "")
    .replace(/^(TOWN|CITY|VILLAGE|COUNTY)\s+OF\s+/i, "")
    .trim();

  return stripped
    .split(/\s+/)
    .map((word, i) => {
      const upper = word.toUpperCase();
      if (KEEP_UPPER.has(upper)) return upper;
      const lower = word.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.replace(/(^|[-/(])([a-z])/g, (m, p, c) => p + c.toUpperCase());
    })
    .join(" ");
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

function structureUrl(name) {
  return "/structures/" + name.replace(/[^A-Za-z0-9]+/g, "_") + ".svg";
}

function Molecule3D({ info }) {
  const boxRef = useRef(null);
  const viewerRef = useRef(null);
  const [ready, setReady] = useState(null);
  const [failed, setFailed] = useState(false);
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadViewerLib(), loadMolecules()])
      .then(([lib, data]) => {
        if (!cancelled) setReady({ lib, molecules: data.molecules });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.spin(false);
        viewerRef.current.clear();
        viewerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || !boxRef.current) return;
    if (!viewerRef.current) {
      viewerRef.current = ready.lib.createViewer(boxRef.current, {
        backgroundColor: "white",
      });
    }
    const viewer = viewerRef.current;
    viewer.clear();
    const block = ready.molecules[info.name];
    if (!block) return;
    viewer.addModel(block, "sdf");
    Object.entries(ELEMENT_STYLE).forEach(([symbol, { color }]) => {
      viewer.setStyle(
        { elem: symbol },
        { stick: { radius: 0.14, color }, sphere: { scale: 0.3, color } }
      );
    });
    viewer.zoomTo();
    viewer.render();
  }, [ready, info.name]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (spinning) viewer.spin("vy", 0.6);
    else viewer.spin(false);
  }, [spinning, ready, info.name]);

  const missing = ready && !ready.molecules[info.name];

  return (
    <div className="viewer-card">
      <div className="viewer-box" ref={boxRef} />
      <div className="viewer-info">
        <strong>{info.name}</strong>
        <span className="note">{info.fullName}</span>
        <span className="note">
          {info.formula} · {info.family}
        </span>
        <button
          type="button"
          className="ghost"
          onClick={() => setSpinning(!spinning)}
        >
          {spinning ? "Pause rotation" : "Resume rotation"}
        </button>
        {failed && (
          <p className="note">
            The 3D model data could not be loaded. Check that
            public/data/pfas_3d.json exists.
          </p>
        )}
        {!ready && !failed && <p className="note">Loading 3D model…</p>}
        {missing && <p className="note">No 3D model is available for this compound.</p>}
        <p className="note">
          Drag to rotate, scroll or pinch to zoom. This is a computed model of
          one possible low-energy shape, drawn with RDKit. Real molecules flex
          and bend, so treat it as an illustration, not a measured structure.
        </p>
        <div className="legend">
          {Object.entries(ELEMENT_STYLE).map(([symbol, { color, label }]) => (
            <span key={symbol}>
              <i style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompoundCard({ info, badge, detected }) {
  return (
    <div className="compound-card">
      <img
        src={structureUrl(info.name)}
        alt={`Structure of ${info.fullName}`}
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
      <strong>{info.name}</strong>
      <span className="note">{info.fullName}</span>
      <span className={detected ? "badge hit" : "badge"}>{badge}</span>
      <p className="note">
        {info.family}
        <br />
        Similarity to PFOA {info.similarityToPFOA.toFixed(2)} · to PFOS{" "}
        {info.similarityToPFOS.toFixed(2)}
      </p>
    </div>
  );
}

function ChemistrySection({ system, clusters, disclaimer }) {
  const known = (item) => Boolean(clusters && clusters[item.contaminant]);
  const detected = system.detected.filter(known);
  const notDetected = system.notDetected.filter(known);
  const [active, setActive] = useState(
    detected.length
      ? detected[0].contaminant
      : notDetected.length
      ? notDetected[0].contaminant
      : null
  );

  if (!clusters || detected.length + notDetected.length === 0) return null;
  const activeInfo = clusters[active] || null;

  return (
    <>
      <h4>Chemistry of the PFAS tested</h4>
      <p className="note">
        Each diagram shows the structure of the molecule. Similarity scores
        compare structures on a scale from 0 to 1, where 1 means identical.{" "}
        {disclaimer}
      </p>

      <p className="subhead">Detected in this system</p>
      {detected.length === 0 ? (
        <p className="note">
          No PFAS were detected at or above the reporting level.
        </p>
      ) : (
        <div className="compound-grid">
          {detected.map((d) => (
            <CompoundCard
              key={d.contaminant}
              info={clusters[d.contaminant]}
              detected
              badge={`${pptOf(d.maxValue)} ppt`}
            />
          ))}
        </div>
      )}

      {notDetected.length > 0 && (
        <details className="structure-details">
          <summary>
            Show structures of the {notDetected.length} PFAS not detected
          </summary>
          <div className="compound-grid">
            {notDetected.map((n) => (
              <CompoundCard
                key={n.contaminant}
                info={clusters[n.contaminant]}
                detected={false}
                badge={`Not detected (< ${pptOf(n.mrl)} ppt)`}
              />
            ))}
          </div>
        </details>
      )}

      <p className="subhead">Explore a molecule in 3D</p>
      <label className="picker">
        Compound:
        <select value={active || ""} onChange={(e) => setActive(e.target.value)}>
          {detected.length > 0 && (
            <optgroup label="Detected in this system">
              {detected.map((d) => (
                <option key={d.contaminant} value={d.contaminant}>
                  {d.contaminant}
                </option>
              ))}
            </optgroup>
          )}
          {notDetected.length > 0 && (
            <optgroup label="Tested, not detected">
              {notDetected.map((n) => (
                <option key={n.contaminant} value={n.contaminant}>
                  {n.contaminant}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      {activeInfo && <Molecule3D info={activeInfo} />}
    </>
  );
}

function SystemDetail({
  system,
  units,
  allSystems,
  allContaminants,
  clusters,
  disclaimer,
}) {
  const reported = new Set([
    ...system.detected.map((d) => d.contaminant),
    ...system.notDetected.map((n) => n.contaminant),
  ]);
  const missing = allContaminants.filter((c) => !reported.has(c));

  return (
    <article className="system-card">
      <h3>{displayName(system.name)}</h3>
      <p>
        Water system ID: {system.id} · ZIP codes served:{" "}
        {system.zips.join(", ") || "not listed"}
      </p>
      <p className="note">
        Samples collected {formatDate(system.firstSample)} to{" "}
        {formatDate(system.lastSample)}.
      </p>

      <Findings
        system={system}
        units={units}
        allSystems={allSystems}
        clusters={clusters}
      />

      <ChemistrySection
        system={system}
        clusters={clusters}
        disclaimer={disclaimer}
      />

      <h4>Not detected</h4>
      <p className="note">
        These were tested for but not found at or above the reporting level,
        which is the lowest amount the lab method can reliably report. Not
        detected does not mean zero.
      </p>
      <div className="chips">
        {system.notDetected.map((n) => (
          <span className="chip" key={n.contaminant}>
            {n.contaminant} (&lt; {pptOf(n.mrl)} ppt)
          </span>
        ))}
      </div>

      {missing.length > 0 && (
        <>
          <h4>No result reported</h4>
          <p className="note">
            This dataset has no result for this system for: {missing.join(", ")}.
            A missing result is not the same as a clean result.
          </p>
        </>
      )}

      <p>
        <a href={EPA_DATA_FINDER} target="_blank" rel="noreferrer">
          Check this system ({system.id}) in the EPA Data Finder ↗
        </a>
      </p>
    </article>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [clusterData, setClusterData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [matches, setMatches] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (matches === null || !resultsRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [matches]);

  useEffect(() => {
    fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(setData)
      .catch(() => setLoadError(true));

    fetch(CLUSTER_URL)
      .then((response) => {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(setClusterData)
      .catch(() => setClusterData(null));
  }, []);

  const clusters = useMemo(() => {
    if (!clusterData) return null;
    return Object.fromEntries(clusterData.compounds.map((c) => [c.name, c]));
  }, [clusterData]);

  const allContaminants = useMemo(() => {
    if (!data) return [];
    const names = new Set();
    data.systems.forEach((s) => {
      s.detected.forEach((d) => names.add(d.contaminant));
      s.notDetected.forEach((n) => names.add(n.contaminant));
    });
    return [...names].sort();
  }, [data]);

  function findSystem(event) {
    event.preventDefault();
    if (!data) return;
    const query = search.trim();
    const lower = query.toLowerCase();
    const isZip = /^\d{5}$/.test(query);

    const found = data.systems.filter((s) =>
      isZip
        ? s.zips.includes(query)
        : s.name.toLowerCase().includes(lower) || s.id.toLowerCase() === lower
    );

    setSubmitted(query);
    setMatches(found);
    setSelectedId(found.length === 1 ? found[0].id : null);
  }

  const selected = matches ? matches.find((s) => s.id === selectedId) : null;

  return (
    <>
      <header className="masthead" id="home">
        <div className="wrap">
          <nav className="nav" aria-label="Main">
            <a className="brand" href="#home">
              <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.5C12 2.5 5 10.2 5 15a7 7 0 0 0 14 0c0-4.8-7-12.5-7-12.5z" />
              </svg>
              PFAS Decoder
            </a>
            <div className="nav-links">
              <a href="#about">How it works</a>
              <a href="#wells">Private wells</a>
            </div>
          </nav>

          <div className="hero">
            <div className="hero-copy">
              <h1>Your water report, in plain English.</h1>
              <p className="intro">
                Explore public drinking-water monitoring results for North
                Carolina, learn about PFAS chemistry, and find reliable sources
                for your next steps.
              </p>

              <form className="search" onSubmit={findSystem}>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ZIP code or water system"
                  aria-label="ZIP code or water system"
                  required
                />
                <button type="submit" disabled={!data}>Search</button>
              </form>

              <p className="note">
                {loadError
                  ? "The data file could not be loaded. Check that public/data/nc_pfas.json exists."
                  : data
                  ? `Data: ${data.source}.`
                  : "Loading data…"}
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
        </div>
      </header>

      <main>
        {data && (
          <div className="wrap facts">
            <div>
              <strong>{data.systemCount.toLocaleString("en-US")}</strong>
              <span>North Carolina water systems in the data</span>
            </div>
            <div>
              <strong>{allContaminants.length}</strong>
              <span>different PFAS tested for</span>
            </div>
          </div>
        )}

        {matches !== null && (
          <section className="results" ref={resultsRef}>
            <div className="wrap">
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
                <SystemDetail
                  key={selected.id}
                  system={selected}
                  units={data.units}
                  allSystems={data.systems}
                  allContaminants={allContaminants}
                  clusters={clusters}
                  disclaimer={clusterData ? clusterData.disclaimer : ""}
                />
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

        <section className="how" id="about">
          <div className="wrap">
            <h2>What this site helps you do</h2>
            <div className="features">
              <article>
                <span className="icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 3h7l4 4v14H7z" />
                    <path d="M14 3v4h4M10 12h5M10 16h5" />
                  </svg>
                </span>
                <h3>Read the results</h3>
                <p>
                  Learn what a reported concentration means, how it was
                  measured, and what the monitoring data cannot establish.
                </p>
              </article>

              <article>
                <span className="icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="6" cy="7" r="2.5" />
                    <circle cx="18" cy="7" r="2.5" />
                    <circle cx="12" cy="18" r="2.5" />
                    <path d="M8.3 8.2l2.3 7.3M15.7 8.2l-2.3 7.3M8.5 7h7" />
                  </svg>
                </span>
                <h3>Explore the chemistry</h3>
                <p>
                  Compare molecular structures using RDKit fingerprints.
                  Structural similarity does not prove equal toxicity.
                </p>
              </article>

              <article>
                <span className="icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 5h16v11H9l-5 4z" />
                    <path d="M10 9.5a2 2 0 1 1 3 1.7c-.7.4-1 .8-1 1.5M12 14.8v.2" />
                  </svg>
                </span>
                <h3>Ask better questions</h3>
                <p>
                  Find official sources and questions to ask your water
                  provider. Private wells require a separate testing pathway.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="well" id="wells">
          <div className="wrap well-grid">
            <h2>Private wells</h2>
            <p>
              UCMR 5 tested public water systems. It did not test private wells,
              so nothing on this page describes a private well. Well owners can
              have their water tested by a state-certified laboratory, and a
              county health department can usually point you to one.
            </p>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <p>
            Data source: U.S. EPA UCMR 5. This site is not a safety
            determination or medical advice.
          </p>
          <a href={EPA_OCCURRENCE} target="_blank" rel="noreferrer">
            Visit the official EPA source ↗
          </a>
        </div>
      </footer>
    </>
  );
}

export default App;