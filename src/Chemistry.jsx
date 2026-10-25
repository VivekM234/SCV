import { useEffect, useRef, useState } from "react";
import Findings from "./Findings.jsx";
import { displayName, formatDate, structureUrl, toPpt } from "./lib.js";

const MOL_URL = "/data/pfas_3d.json";
export const EPA_DATA_FINDER =
  "https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder";
export const EPA_OCCURRENCE =
  "https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule";

const ELEMENT_STYLE = {
  C: { color: "#4a5a55", label: "Carbon" },
  F: { color: "#5cc27a", label: "Fluorine" },
  O: { color: "#d94c4c", label: "Oxygen" },
  S: { color: "#e3b72a", label: "Sulfur" },
  N: { color: "#3f6fd8", label: "Nitrogen" },
  Cl: { color: "#8a4fc9", label: "Chlorine" },
  H: { color: "#c9d1cd", label: "Hydrogen" },
};


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

export function Molecule3D({ info }) {
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
              badge={`${toPpt(d.maxValue)} ppt`}
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
                badge={`Not detected (< ${toPpt(n.mrl)} ppt)`}
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

export function SystemDetail({
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
            {n.contaminant} (&lt; {toPpt(n.mrl)} ppt)
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
