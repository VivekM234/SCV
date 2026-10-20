import { useEffect, useMemo, useState } from "react";
import "./App.css";

const DATA_URL = "/data/nc_pfas.json";
const EPA_DATA_FINDER =
  "https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder";
const EPA_OCCURRENCE =
  "https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule";

function formatDate(iso) {
  if (!iso) return "date not reported";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SystemDetail({ system, units, allContaminants }) {
  const reported = new Set([
    ...system.detected.map((d) => d.contaminant),
    ...system.notDetected.map((n) => n.contaminant),
  ]);
  const missing = allContaminants.filter((c) => !reported.has(c));

  return (
    <article className="system-card">
      <h3>{system.name}</h3>
      <p>
        Water system ID: {system.id} · ZIP codes served:{" "}
        {system.zips.join(", ") || "not listed"}
      </p>
      <p className="note">
        Samples collected {formatDate(system.firstSample)} to{" "}
        {formatDate(system.lastSample)}.
      </p>

      <h4>Measured values</h4>
      {system.detected.length === 0 ? (
        <p>
          No PFAS were detected at or above the reporting level in this
          system&rsquo;s UCMR 5 results.
        </p>
      ) : (
        system.detected.map((item) => (
          <div className="result-row" key={item.contaminant}>
            <strong>{item.contaminant}</strong>
            <span>
              {item.maxValue} {units}
            </span>
            <p>
              Highest measured result, collected {formatDate(item.maxDate)}.
              Detected in {item.detections} of {item.samples} sample results.
              Reporting level: {item.mrl} {units}.
            </p>
          </div>
        ))
      )}

      <h4>Not detected</h4>
      <p className="note">
        These were tested for but not found at or above the reporting level,
        which is the lowest amount the lab method can reliably report. Not
        detected does not mean zero.
      </p>
      <div className="chips">
        {system.notDetected.map((n) => (
          <span className="chip" key={n.contaminant}>
            {n.contaminant} (&lt; {n.mrl} {units})
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
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [matches, setMatches] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(setData)
      .catch(() => setLoadError(true));
  }, []);

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
    <main className="page">
      <nav className="nav">
        <a className="brand" href="#home">PFAS / DECODER</a>
        <a href="#about">About this project</a>
      </nav>

      <section className="hero" id="home">
        <p className="eyebrow">NORTH CAROLINA · DRINKING WATER</p>
        <h1>Your water report,<br />in plain English.</h1>
        <p className="intro">
          Explore public drinking-water monitoring results, learn about
          PFAS chemistry, and find reliable sources for your next steps.
        </p>

        <form className="search" onSubmit={findSystem}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Enter a ZIP code or water system"
            aria-label="ZIP code or water system"
            required
          />
          <button type="submit" disabled={!data}>Search</button>
        </form>

        <p className="note">
          {loadError
            ? "The data file could not be loaded. Check that public/data/nc_pfas.json exists."
            : data
            ? `Data: ${data.source}. ${data.systemCount} North Carolina water systems.`
            : "Loading data…"}
        </p>
      </section>

      {matches !== null && (
        <section className="results">
          <h2>Search results</h2>

          {matches.length === 0 && (
            <div className="callout">
              No UCMR 5 results found for &ldquo;{submitted}&rdquo;. That does
              not mean the water is untested or safe. UCMR 5 did not monitor
              every public water system, a ZIP code can be served by systems not
              listed here, and private wells are not covered.
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
                  {s.name} <span>{s.id}</span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <SystemDetail
              system={selected}
              units={data.units}
              allContaminants={allContaminants}
            />
          )}

          {matches.length > 0 && (
            <div className="callout">
              This page shows what was measured. It does not say whether water
              is safe to drink.
            </div>
          )}
        </section>
      )}

      <section className="features" id="about">
        <article>
          <span className="number">01 / UNDERSTAND</span>
          <h2>Read the results</h2>
          <p>
            Learn what a reported concentration means, how it was measured,
            and what the monitoring data cannot establish.
          </p>
        </article>

        <article>
          <span className="number">02 / EXPLORE</span>
          <h2>Explore the chemistry</h2>
          <p>
            Compare molecular structures using RDKit fingerprints.
            Structural similarity does not prove equal toxicity.
          </p>
        </article>

        <article>
          <span className="number">03 / TAKE ACTION</span>
          <h2>Ask better questions</h2>
          <p>
            Find official sources and questions to ask your water provider.
            Private wells require a separate testing pathway.
          </p>
        </article>
      </section>

      <section className="well" id="wells">
        <h2>Private wells</h2>
        <p>
          UCMR 5 tested public water systems. It did not test private wells, so
          nothing on this page describes a private well. Well owners can have
          their water tested by a state-certified laboratory, and a county
          health department can usually point you to one.
        </p>
      </section>

      <footer>
        <p>
          Data source: U.S. EPA UCMR 5. This site is not a safety
          determination or medical advice.
        </p>
        <a href={EPA_OCCURRENCE} target="_blank" rel="noreferrer">
          Visit the official EPA source ↗
        </a>
      </footer>
    </main>
  );
}
export default App;