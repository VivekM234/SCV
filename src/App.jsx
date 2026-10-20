import { useState } from "react";
import "./App.css";

const demoSystems = [
  {
    id: "demo-1",
    name: "Example Water System — Durham",
    zip: "27701",
    results: [
      { name: "PFOA", value: "Demo only", explanation: "A perfluoroalkyl carboxylic acid." },
      { name: "PFOS", value: "Demo only", explanation: "A perfluoroalkyl sulfonic acid." },
    ],
  },
  {
    id: "demo-2",
    name: "Example Water System — Chapel Hill",
    zip: "27514",
    results: [
      { name: "PFHxS", value: "Demo only", explanation: "A perfluoroalkyl sulfonic acid." },
    ],
  },
];

function App() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  function findSystem(event) {
    event.preventDefault();
    const query = search.trim().toLowerCase();

    const matches = demoSystems.filter(
      (system) =>
        system.zip.includes(query) ||
        system.name.toLowerCase().includes(query)
    );

    setSelected(matches);
  }

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
          <button type="submit">Search</button>
        </form>

        <p className="note">
          Prototype: sample records only. Real EPA data is not connected yet.
        </p>
      </section>

      {selected !== null && (
        <section className="results">
          <h2>Search results</h2>
          {selected.length === 0 ? (
            <p>No demo systems matched. Try 27701 or 27514.</p>
          ) : (
            selected.map((system) => (
              <article className="system-card" key={system.id}>
                <h3>{system.name}</h3>
                <p>ZIP code: {system.zip}</p>
                <p className="note">Demonstration data — not measured results.</p>
                {system.results.map((item) => (
                  <div className="result-row" key={item.name}>
                    <strong>{item.name}</strong>
                    <span>{item.value}</span>
                    <p>{item.explanation}</p>
                  </div>
                ))}
              </article>
            ))
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

      <footer>
        <p>
          Data source planned: U.S. EPA UCMR 5. This prototype is not a
          safety determination or medical advice.
        </p>
        <a href="https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule">
          Visit the official EPA source ↗
        </a>
      </footer>
    </main>
  );
}

export default App;
