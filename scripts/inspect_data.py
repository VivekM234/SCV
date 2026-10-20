from pathlib import Path
import pandas as pd

folder = Path("scripts/ucmr5_raw")

for path in folder.rglob("*.txt"):
    print(f"\n--- {path.name} ---")
    try:
        df = pd.read_csv(
            path,
            sep="\t",
            nrows=3,
            dtype=str,
            encoding="cp1252",
            encoding_errors="replace",
            on_bad_lines="warn",
        )
        print("Columns:")
        print(df.columns.tolist())
        print("\nFirst rows:")
        print(df.head(2).to_string(index=False))
    except Exception as error:
        print(f"Could not inspect this file: {error}")