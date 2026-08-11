import json
from pathlib import Path


source = Path("n3_vocab_curated.json")
output = Path("japanese-vocab-quiz/n3-vocab-data.js")
items = json.loads(source.read_text(encoding="utf-8"))
compact = json.dumps(items, ensure_ascii=False, separators=(",", ":"))
output.write_text(f"globalThis.N3_VOCAB_DATA = {compact};\n", encoding="utf-8")
print(f"exported {len(items)} N3 items to {output}")
