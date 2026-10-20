from pathlib import Path
import pandas as pd

raw = Path("scripts/ucmr5_raw")
results_file = next(raw.glob("UCMR5_All_*.txt"))

cols = [
    "PWSID", "PWSName", "Contaminant", "MRL", "Units",
    "AnalyticalResultsSign", "AnalyticalResultValue",
    "CollectionDate", "State",
]

parts = []
for chunk in pd.read_csv(
    results_file,
    sep="\t",
    dtype=str,
    encoding="cp1252",
    usecols=cols,
    chunksize=200000,
):
    parts.append(chunk[chunk["State"] == "NC"])

nc = pd.concat(parts)
print("NC rows:", len(nc))
print("NC water systems:", nc["PWSID"].nunique())

print("\nResult sign counts:")
print(nc["AnalyticalResultsSign"].value_counts(dropna=False))

print("\nUnits:")
print(nc["Units"].value_counts(dropna=False))

print("\nContaminants:")
print(nc["Contaminant"].value_counts())

print("\nExample rows that are not '<':")
print(nc[nc["AnalyticalResultsSign"] != "<"].head(5).to_string(index=False))

zips = pd.read_csv(raw / "UCMR5_ZIPCodes.txt", sep="\t", dtype=str, encoding="cp1252")
missing = set(nc["PWSID"]) - set(zips["PWSID"])
print("\nNC water systems with no ZIP codes:", len(missing))