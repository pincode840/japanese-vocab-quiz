import hashlib
import json
from pathlib import Path

import pdfplumber

from source_paths import N3_PDF_DIR


ROOT = N3_PDF_DIR
FILES = sorted(ROOT.glob("*.pdf"))
OUTPUT_DIR = Path("tmp/pdfs/n3")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


summary = []
for index, path in enumerate(FILES, start=1):
    with pdfplumber.open(path) as pdf:
        pages = [page.extract_text(x_tolerance=2, y_tolerance=3) or "" for page in pdf.pages]

    text = "\n\n".join(
        f"--- PAGE {page_number} ---\n{page_text}"
        for page_number, page_text in enumerate(pages, start=1)
    )
    target = OUTPUT_DIR / f"{index:02d}_{path.stem}.txt"
    target.write_text(text, encoding="utf-8")
    summary.append(
        {
            "index": index,
            "name": path.name,
            "path": str(path),
            "pages": len(pages),
            "page_characters": [len(page) for page in pages],
            "characters": len(text),
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "text_file": str(target),
            "sample": text[:2200],
        }
    )

(OUTPUT_DIR / "summary.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

for item in summary:
    nonempty = sum(1 for size in item["page_characters"] if size)
    print(
        f"\n### {item['index']} {item['name']} "
        f"pages={item['pages']} text_pages={nonempty} chars={item['characters']}"
    )
    print(item["sample"].replace("\n", " ")[:1200])
