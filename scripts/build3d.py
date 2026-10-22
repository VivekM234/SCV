import json
from pathlib import Path

from rdkit import Chem
from rdkit.Chem import AllChem

SRC = Path("public/data/pfas_clusters.json")
OUT = Path("public/data/pfas_3d.json")

with open(SRC, encoding="utf-8") as f:
    compounds = json.load(f)["compounds"]


def make_3d(smiles):
    mol = Chem.AddHs(Chem.MolFromSmiles(smiles))
    params = AllChem.ETKDGv3()
    params.randomSeed = 42
    status = AllChem.EmbedMolecule(mol, params)
    if status != 0:
        params.useRandomCoords = True
        status = AllChem.EmbedMolecule(mol, params)
    if status != 0:
        return None, "embedding failed"

    if AllChem.MMFFHasAllMoleculeParams(mol):
        AllChem.MMFFOptimizeMolecule(mol, maxIters=2000)
        return mol, "MMFF94"
    AllChem.UFFOptimizeMolecule(mol, maxIters=2000)
    return mol, "UFF"


molecules = {}
failed = []
methods = {}
for rec in compounds:
    mol, method = make_3d(rec["smiles"])
    if mol is None:
        failed.append(rec["name"])
        continue
    methods[method] = methods.get(method, 0) + 1
    molecules[rec["name"]] = Chem.MolToMolBlock(mol)

payload = {
    "method": "RDKit ETKDGv3 embedding, then force-field optimization",
    "molecules": molecules,
}

OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(payload, f, separators=(",", ":"))

print(f"Wrote {len(molecules)} 3D models to {OUT}")
print("Force fields used:", methods)
print("Size (KB):", round(OUT.stat().st_size / 1024))
if failed:
    print("FAILED:", failed)