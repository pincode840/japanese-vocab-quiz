import json
from pathlib import Path

from build_vocab_book import load_records


output_dir = Path("japanese-vocab-quiz")
output_dir.mkdir(exist_ok=True)
sentence_path = Path("basic_sentences.json")
sentence_items = json.loads(sentence_path.read_text(encoding="utf-8"))
sentence_by_id = {item["id"]: item for item in sentence_items}
records = []
for index, record in enumerate(load_records(), start=1):
    record_id = f"d{record['day']}-{record['no']}"
    sentence_item = sentence_by_id.get(record_id)
    if sentence_item is None:
        raise ValueError(f"예문이 없는 단어입니다: {record_id}")
    records.append({
        "id": record_id,
        "day": record["day"],
        "no": int(record["no"]),
        "word": record["word"],
        "reading": record["reading"],
        "meaning": record["meaning"],
        "sentence": sentence_item["sentence"],
        "sentenceFurigana": sentence_item["sentenceFurigana"],
        "sentenceTranslation": sentence_item["sentenceTranslation"],
    })

if len(records) != 480 or len(sentence_by_id) != 480:
    raise ValueError("N5·N4 단어와 예문은 각각 480개여야 합니다.")
if not all(
    item["sentence"].count("___") == 1
    and item["sentenceFurigana"].count("___") == 1
    and item["sentenceTranslation"]
    for item in records
):
    raise ValueError("N5·N4 예문의 빈칸, 후리가나 또는 해석이 올바르지 않습니다.")

payload = "globalThis.VOCAB_DATA = " + json.dumps(records, ensure_ascii=False, separators=(",", ":")) + ";\n"
(output_dir / "vocab-data.js").write_text(payload, encoding="utf-8")
print(f"wrote {len(records)} words to {output_dir / 'vocab-data.js'}")
