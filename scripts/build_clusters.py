import json
import sys
from pathlib import Path

from rdkit import Chem, DataStructs
from rdkit.Chem import rdFingerprintGenerator
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

OUT = Path("public/data/pfas_clusters.json")
OCCURRENCE = Path("public/data/nc_pfas.json")


# Helpers that build straight-chain structures
def pfca(n):  # perfluoroalkyl carboxylic acid with n carbons
    return "OC(=O)" + "C(F)(F)" * (n - 2) + "C(F)(F)F"


def pfsa(n):  # perfluoroalkane sulfonic acid with n carbons
    return "OS(=O)(=O)" + "C(F)(F)" * (n - 1) + "C(F)(F)F"


def fts(n):  # n:2 fluorotelomer sulfonic acid
    return "OS(=O)(=O)CC" + "C(F)(F)" * (n - 1) + "C(F)(F)F"


def cl_ether_sulfonic(k):  # chlorinated ether sulfonic acid
    return "OS(=O)(=O)C(F)(F)C(F)(F)O" + "C(F)(F)" * k + "Cl"


FASAA = "N-alkyl perfluorooctanesulfonamidoacetic acid"
SULFONAMIDE_TAIL = "S(=O)(=O)" + "C(F)(F)" * 7 + "C(F)(F)F"

# (name as it appears in the data, full name, family, SMILES, expected formula)
COMPOUNDS = [
    ("PFBA", "perfluorobutanoic acid", "Perfluoroalkyl carboxylic acid", pfca(4), "C4HF7O2"),
    ("PFPeA", "perfluoropentanoic acid", "Perfluoroalkyl carboxylic acid", pfca(5), "C5HF9O2"),
    ("PFHxA", "perfluorohexanoic acid", "Perfluoroalkyl carboxylic acid", pfca(6), "C6HF11O2"),
    ("PFHpA", "perfluoroheptanoic acid", "Perfluoroalkyl carboxylic acid", pfca(7), "C7HF13O2"),
    ("PFOA", "perfluorooctanoic acid", "Perfluoroalkyl carboxylic acid", pfca(8), "C8HF15O2"),
    ("PFNA", "perfluorononanoic acid", "Perfluoroalkyl carboxylic acid", pfca(9), "C9HF17O2"),
    ("PFDA", "perfluorodecanoic acid", "Perfluoroalkyl carboxylic acid", pfca(10), "C10HF19O2"),
    ("PFUnA", "perfluoroundecanoic acid", "Perfluoroalkyl carboxylic acid", pfca(11), "C11HF21O2"),
    ("PFDoA", "perfluorododecanoic acid", "Perfluoroalkyl carboxylic acid", pfca(12), "C12HF23O2"),
    ("PFTrDA", "perfluorotridecanoic acid", "Perfluoroalkyl carboxylic acid", pfca(13), "C13HF25O2"),
    ("PFTA", "perfluorotetradecanoic acid", "Perfluoroalkyl carboxylic acid", pfca(14), "C14HF27O2"),
    ("PFBS", "perfluorobutanesulfonic acid", "Perfluoroalkane sulfonic acid", pfsa(4), "C4HF9O3S"),
    ("PFPeS", "perfluoropentanesulfonic acid", "Perfluoroalkane sulfonic acid", pfsa(5), "C5HF11O3S"),
    ("PFHxS", "perfluorohexanesulfonic acid", "Perfluoroalkane sulfonic acid", pfsa(6), "C6HF13O3S"),
    ("PFHpS", "perfluoroheptanesulfonic acid", "Perfluoroalkane sulfonic acid", pfsa(7), "C7HF15O3S"),
    ("PFOS", "perfluorooctanesulfonic acid", "Perfluoroalkane sulfonic acid", pfsa(8), "C8HF17O3S"),
    ("4:2 FTS", "4:2 fluorotelomer sulfonic acid", "Fluorotelomer sulfonic acid", fts(4), "C6H5F9O3S"),
    ("6:2 FTS", "6:2 fluorotelomer sulfonic acid", "Fluorotelomer sulfonic acid", fts(6), "C8H5F13O3S"),
    ("8:2 FTS", "8:2 fluorotelomer sulfonic acid", "Fluorotelomer sulfonic acid", fts(8), "C10H5F17O3S"),
    ("NEtFOSAA", "N-ethyl perfluorooctanesulfonamidoacetic acid", FASAA,
     "CCN(CC(=O)O)" + SULFONAMIDE_TAIL, "C12H8F17NO4S"),
    ("NMeFOSAA", "N-methyl perfluorooctanesulfonamidoacetic acid", FASAA,
     "CN(CC(=O)O)" + SULFONAMIDE_TAIL, "C11H6F17NO4S"),
    ("HFPO-DA", "hexafluoropropylene oxide dimer acid (GenX chemical)", "Ether carboxylic acid",
     "OC(=O)C(F)(OC(F)(F)C(F)(F)C(F)(F)F)C(F)(F)F", "C6HF11O3"),
    ("ADONA", "4,8-dioxa-3H-perfluorononanoic acid", "Ether carboxylic acid",
     "OC(=O)C(F)(F)C(F)OC(F)(F)C(F)(F)C(F)(F)OC(F)(F)F", "C7H2F12O4"),
    ("PFMPA", "perfluoro-3-methoxypropanoic acid", "Ether carboxylic acid",
     "OC(=O)C(F)(F)C(F)(F)OC(F)(F)F", "C4HF7O3"),
    ("PFMBA", "perfluoro-4-methoxybutanoic acid", "Ether carboxylic acid",
     "OC(=O)C(F)(F)C(F)(F)C(F)(F)OC(F)(F)F", "C5HF9O3"),
    ("NFDHA", "nonafluoro-3,6-dioxaheptanoic acid", "Ether carboxylic acid",
     "OC(=O)C(F)(F)OC(F)(F)C(F)(F)OC(F)(F)F", "C5HF9O4"),
    ("PFEESA", "perfluoro(2-ethoxyethane)sulfonic acid", "Ether sulfonic acid",
     "OS(=O)(=O)C(F)(F)C(F)(F)OC(F)(F)C(F)(F)F", "C4HF9O4S"),
    ("9Cl-PF3ONS", "9-chlorohexadecafluoro-3-oxanonane-1-sulfonic acid", "Ether sulfonic acid",
     cl_ether_sulfonic(6), "C8HClF16O4S"),
    ("11Cl-PF3OUdS", "11-chloroeicosafluoro-3-oxaundecane-1-sulfonic acid", "Ether sulfonic acid",
     cl_ether_sulfonic(8), "C10HClF20O4S"),
]

gen = rdFingerprintGenerator.GetMorganGenerator(radius=2, fpSize=2048)

problems = []
records = []
fps = {}

# 1. Validate structures
for name, full_name, family, smiles, expected in COMPOUNDS:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        problems.append(f"{name}: SMILES could not be parsed")
        continue
    formula = CalcMolFormula(mol)
    if formula != expected:
        problems.append(f"{name}: formula {formula} does not match expected {expected}")
    carbons = sum(1 for atom in mol.GetAtoms() if atom.GetSymbol() == "C")
    fps[name] = gen.GetFingerprint(mol)
    records.append({
        "name": name,
        "fullName": full_name,
        "family": family,
        "smiles": smiles,
        "formula": formula,
        "carbonAtoms": carbons,
    })

# 2. Check the names against the occurrence data
if OCCURRENCE.exists():
    with open(OCCURRENCE, encoding="utf-8") as f:
        data = json.load(f)
    in_data = set()
    for system in data["systems"]:
        for item in system["detected"] + system["notDetected"]:
            in_data.add(item["contaminant"])
    ours = {c[0] for c in COMPOUNDS}
    for name in sorted(in_data - ours):
        problems.append(f"{name}: appears in nc_pfas.json but is missing from this script")
    for name in sorted(ours - in_data):
        print(f"Note: {name} is in this script but not in nc_pfas.json")
else:
    print("Note: nc_pfas.json not found, skipping the name check")

if problems:
    print("\nPROBLEMS FOUND. Nothing was written:")
    for p in problems:
        print(" -", p)
    sys.exit(1)

# 3. Similarity scores
for rec in records:
    name = rec["name"]
    rec["similarityToPFOA"] = round(DataStructs.TanimotoSimilarity(fps[name], fps["PFOA"]), 3)
    rec["similarityToPFOS"] = round(DataStructs.TanimotoSimilarity(fps[name], fps["PFOS"]), 3)
    neighbors = sorted(
        (
            (DataStructs.TanimotoSimilarity(fps[name], fps[other["name"]]), other["name"])
            for other in records
            if other["name"] != name
        ),
        reverse=True,
    )[:3]
    rec["mostSimilar"] = [{"name": n, "similarity": round(s, 3)} for s, n in neighbors]

payload = {
    "method": "Morgan fingerprints (radius 2, 2048 bits) compared with Tanimoto similarity",
    "references": ["PFOA", "PFOS"],
    "disclaimer": (
        "These scores describe structural similarity only. They are not a "
        "measure of toxicity, and similar structure does not show that two "
        "compounds have the same effects on the body."
    ),
    "compounds": records,
}

OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=1)

print(f"All {len(records)} structures parsed and formulas match.")
print("Wrote:", OUT)
print()
print(f"{'name':14} {'similarity to PFOA':>19} {'to PFOS':>9}  family")
for rec in records:
    print(
        f"{rec['name']:14} {rec['similarityToPFOA']:>19} "
        f"{rec['similarityToPFOS']:>9}  {rec['family']}"
    )