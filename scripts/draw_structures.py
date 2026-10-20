import json
import re
from pathlib import Path

from rdkit import Chem
from rdkit.Chem.Draw import rdMolDraw2D

SRC = Path("public/data/pfas_clusters.json")
OUT_DIR = Path("public/structures")
OUT_DIR.mkdir(parents=True, exist_ok=True)

with open(SRC, encoding="utf-8") as f:
    data = json.load(f)

count = 0
for rec in data["compounds"]:
    mol = Chem.MolFromSmiles(rec["smiles"])
    if mol is None:
        print("Could not parse", rec["name"])
        continue

    drawer = rdMolDraw2D.MolDraw2DSVG(480, 260)
    drawer.drawOptions().clearBackground = False
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()

    filename = re.sub(r"[^A-Za-z0-9]+", "_", rec["name"]) + ".svg"
    (OUT_DIR / filename).write_text(drawer.GetDrawingText(), encoding="utf-8")
    count += 1

print(f"Wrote {count} structure drawings to {OUT_DIR}")