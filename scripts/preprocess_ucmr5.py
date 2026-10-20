import json
from pathlib import Path

import pandas as pd

RAW = Path("scripts/ucmr5_raw")
OUT = Path("public/data/nc_pfas.json")

results_file = next(RAW.glob("UCMR5_All_*.txt"))
zip_file = RAW / "UCMR5_ZIPCodes.txt"

COLS = [
    "PWSID", "PWSName", "Contaminant", "MRL",
    "AnalyticalResultsSign", "AnalyticalResultValue",
    "CollectionDate", "State",
]

# 1. Read the big file in pieces and keep only North Carolina
parts = []
for chunk in pd.read_csv(
    results_file,
    sep="\t",
    dtype=str,
    encoding="cp1252",
    usecols=COLS,
    chunksize=200000,
):
    parts.append(chunk[chunk["State"] == "NC"])
nc = pd.concat(parts, ignore_index=True)

# 2. Clean up text and drop lithium (it is not a PFAS)
for col in ["PWSID", "PWSName", "Contaminant", "AnalyticalResultsSign"]:
    nc[col] = nc[col].str.strip()
nc = nc[nc["Contaminant"].str.lower() != "lithium"].copy()

# 3. Convert numbers and dates. A blank value stays blank (it is not zero).
nc["MRL"] = pd.to_numeric(nc["MRL"], errors="coerce")
nc["value"] = pd.to_numeric(nc["AnalyticalResultValue"], errors="coerce")
nc["date"] = pd.to_datetime(nc["CollectionDate"], format="%m/%d/%Y", errors="coerce")
nc["detected"] = (nc["AnalyticalResultsSign"] == "=") & nc["value"].notna()


def iso(d):
    return None if pd.isna(d) else d.strftime("%Y-%m-%d")


# 4. ZIP codes for each water system
zips = pd.read_csv(zip_file, sep="\t", dtype=str, encoding="cp1252")
zips["PWSID"] = zips["PWSID"].str.strip()
zips["ZIPCODE"] = zips["ZIPCODE"].str.strip()
zip_map = zips.groupby("PWSID")["ZIPCODE"].apply(lambda s: sorted(set(s))).to_dict()

# 5. Build one summary record per water system
systems = []
for pwsid, sysdf in nc.groupby("PWSID"):
    detected = []
    not_detected = []

    for contaminant, g in sysdf.groupby("Contaminant"):
        mrl = float(g["MRL"].max())
        hits = g[g["detected"]]
        if len(hits) > 0:
            top = hits.loc[hits["value"].idxmax()]
            detected.append({
                "contaminant": contaminant,
                "maxValue": float(top["value"]),
                "maxDate": iso(top["date"]),
                "detections": int(len(hits)),
                "samples": int(len(g)),
                "mrl": mrl,
            })
        else:
            not_detected.append({
                "contaminant": contaminant,
                "mrl": mrl,
                "samples": int(len(g)),
            })

    detected.sort(key=lambda d: d["contaminant"])
    not_detected.sort(key=lambda d: d["contaminant"])

    systems.append({
        "id": pwsid,
        "name": sysdf["PWSName"].iloc[0],
        "zips": zip_map.get(pwsid, []),
        "firstSample": iso(sysdf["date"].min()),
        "lastSample": iso(sysdf["date"].max()),
        "detected": detected,
        "notDetected": not_detected,
    })

systems.sort(key=lambda s: s["name"])

payload = {
    "source": "U.S. EPA UCMR 5 final dataset (released August 2026)",
    "state": "NC",
    "units": "\u00b5g/L",
    "note": (
        "Not detected means below the minimum reporting level (MRL), "
        "not zero. This is not a safety determination."
    ),
    "systemCount": len(systems),
    "systems": systems,
}

OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(payload, f, separators=(",", ":"))

# 6. Summary
with_detects = sum(1 for s in systems if s["detected"])
no_zip = sum(1 for s in systems if not s["zips"])
print("Wrote:", OUT)
print("Size (KB):", round(OUT.stat().st_size / 1024))
print("NC rows kept (PFAS only):", len(nc))
print("Water systems:", len(systems))
print("Systems with at least one detection:", with_detects)
print("Systems with no ZIP codes:", no_zip)