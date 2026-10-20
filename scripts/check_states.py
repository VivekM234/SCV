from pathlib import Path
import pandas as pd

raw = Path("scripts/ucmr5_raw")
results_file = next(raw.glob("UCMR5_All_*.txt"))

counts = {}
for chunk in pd.read_csv(
    results_file,
    sep="\t",
    dtype=str,
    encoding="cp1252",
    usecols=["State", "PWSID"],
    chunksize=200000,
):
    for state, n in chunk["State"].value_counts().items():
        counts[state] = counts.get(state, 0) + n

print(results_file.name)
print("Rows per state:")
for state in sorted(counts):
    print(state, counts[state])
print("NC rows:", counts.get("NC", 0))

zips = pd.read_csv(raw / "UCMR5_ZIPCodes.txt", sep="\t", dtype=str, encoding="cp1252")
print("ZIP file rows:", len(zips))
print("PWSIDs starting with NC in ZIP file:", zips["PWSID"].str.startswith("NC").sum())