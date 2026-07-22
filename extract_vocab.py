import json
import re
from pathlib import Path
from docx import Document

from source_paths import KAKAO_SOURCE_DIR

ROOT = KAKAO_SOURCE_DIR
OUT = Path("vocab_raw.json")

def sort_key(path: Path):
    m = re.search(r"(\d+)$", path.stem)
    return int(m.group(1)) if m else 0

def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\n", " ")).strip()

records = []
for path in sorted(ROOT.glob("능력단어*.docx"), key=sort_key):
    day = sort_key(path)
    if not 7 <= day <= 30:
        continue
    doc = Document(path)
    for table in doc.tables:
        for row in table.rows[1:]:
            cells = [clean(c.text) for c in row.cells]
            if len(cells) < 4 or not cells[1]:
                continue
            records.append({
                "day": day,
                "no": cells[0],
                "word": cells[1],
                "reading": cells[2],
                "meaning": cells[3],
                "example": cells[4] if len(cells) > 4 else "",
            })

OUT.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"wrote {len(records)} records to {OUT}")
for day in sorted({r['day'] for r in records}):
    items = [r for r in records if r['day'] == day]
    print(f"DAY {day} ({len(items)}): " + " | ".join(
        f"{r['word']} [{r['reading']}] = {r['meaning']}" for r in items
    ))
