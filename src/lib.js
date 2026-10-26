// Shared helpers for reading and presenting the real data in public/data.

const LIMITS_URL = "/data/epa_limits.json";

let limitsPromise = null;
export function loadLimits() {
  if (!limitsPromise) {
    limitsPromise = fetch(LIMITS_URL)
      .then((response) => {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .catch((error) => {
        limitsPromise = null;
        throw error;
      });
  }
  return limitsPromise;
}

// The data file stores micrograms per liter. The site shows parts per trillion.
export function toPpt(microgramsPerLiter) {
  return Number((microgramsPerLiter * 1000).toPrecision(3));
}

export function formatDate(iso) {
  if (!iso) return "date not reported";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const SMALL_WORDS = new Set(["of", "and", "the", "at", "for", "in"]);
const KEEP_UPPER = new Set(["NC", "II", "III", "IV", "US", "LLC", "INC"]);

export function displayName(name) {
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

export function structureUrl(name) {
  return "/structures/" + name.replace(/[^A-Za-z0-9]+/g, "_") + ".svg";
}

// Compare one detected result with the EPA limit table (limits may be null).
export function classifyItem(item, limits) {
  const ppt = toPpt(item.maxValue);
  if (!limits) return { level: "unknown", ppt };
  const limit = limits[item.contaminant];
  if (!limit) return { level: "nolimit", ppt };
  return { level: ppt >= limit.mclPpt ? "atOrAbove" : "below", ppt };
}

// One overall label per water system, for the directory table.
// This compares single highest samples with EPA's limits. It is not a
// compliance finding, because EPA checks averages over time.
export function systemStatus(system, limits) {
  if (system.detected.length === 0) return "none";
  if (!limits) return "unknown";
  let anyBelow = false;
  for (const item of system.detected) {
    const { level } = classifyItem(item, limits);
    if (level === "atOrAbove") return "atOrAbove";
    if (level === "below") anyBelow = true;
  }
  return anyBelow ? "below" : "nolimit";
}

export const STATUS_LABEL = {
  atOrAbove: "AT OR ABOVE LIMIT",
  below: "BELOW LIMIT",
  nolimit: "NO EPA-LIMITED PFAS",
  none: "NONE DETECTED",
  unknown: "LIMITS UNAVAILABLE",
};

// Highest result for one compound in one system, as text for a table cell.
export function resultFor(system, name) {
  const found = system.detected.find((d) => d.contaminant === name);
  if (found) return String(toPpt(found.maxValue));
  if (system.notDetected.some((n) => n.contaminant === name)) return "ND";
  return "—";
}
