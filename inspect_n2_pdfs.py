import hashlib
import json
from pathlib import Path

import pdfplumber

from source_paths import N2_DOWNLOAD_DIR, N2_PROBLEM_DIR


FILES = [
    N2_DOWNLOAD_DIR / "N2L (1).pdf",
    N2_DOWNLOAD_DIR / "N2R (1).pdf",
    N2_DOWNLOAD_DIR / "N2G (1).pdf",
    N2_DOWNLOAD_DIR / "N2V (2).pdf",
    N2_DOWNLOAD_DIR / "N2script.pdf",
    N2_PROBLEM_DIR / "N2R.pdf",
    N2_PROBLEM_DIR / "N2G.pdf",
    N2_PROBLEM_DIR / "N2V.pdf",
    N2_PROBLEM_DIR / "N2L.pdf",
]

out_dir = Path("tmp/pdfs")
out_dir.mkdir(parents=True, exist_ok=True)
summary = []
for index, path in enumerate(FILES, start=1):
    with pdfplumber.open(path) as pdf:
        pages = [(page.extract_text(x_tolerance=2, y_tolerance=3) or "") for page in pdf.pages]
    text = "\n\n".join(f"--- PAGE {i + 1} ---\n{page}" for i, page in enumerate(pages))
    target = out_dir / f"{index:02d}_{path.stem.replace(' ', '_').replace('(', '').replace(')', '')}.txt"
    target.write_text(text, encoding="utf-8")
    summary.append({
        "index": index,
        "name": path.name,
        "path": str(path),
        "pages": len(pages),
        "characters": len(text),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "text_file": str(target),
        "sample": text[:1800],
    })

(out_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
for item in summary:
    print(f"\n### {item['index']} {item['name']} pages={item['pages']} chars={item['characters']}")
    print(item["sample"].replace("\n", " ")[:900])
