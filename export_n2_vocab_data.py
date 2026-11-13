import json
import re
import unicodedata
from pathlib import Path


source = Path("n2_vocab_curated.json")
sentence_source = Path("n2_sentences.json")
translation_source = Path("n2_sentence_translations.json")
furigana_source = Path("n2_sentence_furigana.json")
output = Path("japanese-vocab-quiz/n2-vocab-data.js")
workbook_source = Path("n2_workbook_vocab.json")


def word_key(word):
    """Collapse confirmed spelling variants, not unrelated homophones."""
    normalized = unicodedata.normalize("NFKC", word).strip()
    return {"さびる": "錆びる"}.get(normalized, normalized)

items = json.loads(source.read_text(encoding="utf-8"))
sentences = json.loads(sentence_source.read_text(encoding="utf-8"))
translations = json.loads(translation_source.read_text(encoding="utf-8"))
furigana_sentences = json.loads(furigana_source.read_text(encoding="utf-8"))
words = [item["word"] for item in items]
sentence_by_word = {item["word"]: item["sentence"] for item in sentences}
translation_by_word = {item["word"]: item["translation"] for item in translations}
furigana_by_word = {item["word"]: item["furigana"] for item in furigana_sentences}

if len(items) != 100:
    raise ValueError(f"N2 단어는 100개여야 합니다: {len(items)}개")
if len(set(words)) != len(words):
    raise ValueError("N2 단어가 중복되어 있습니다.")
if not all(all(item.get(key) for key in ("word", "reading", "meaning", "source")) for item in items):
    raise ValueError("읽기, 뜻 또는 PDF 출처가 비어 있는 단어가 있습니다.")
if len(sentences) != 100 or len(sentence_by_word) != 100:
    raise ValueError("N2 예문은 중복 없이 100개여야 합니다.")
if set(words) != set(sentence_by_word):
    raise ValueError("N2 단어와 예문 단어가 일치하지 않습니다.")
if not all(sentence_by_word[word].count("___") == 1 for word in words):
    raise ValueError("각 N2 예문에는 빈칸 표시(___)가 정확히 하나 있어야 합니다.")
if len(translations) != 100 or len(translation_by_word) != 100 or set(words) != set(translation_by_word):
    raise ValueError("N2 예문 해석은 단어와 일치하는 100개여야 합니다.")
if not all(translation_by_word[word].strip() for word in words):
    raise ValueError("비어 있는 N2 예문 해석이 있습니다.")
if len(furigana_sentences) != 100 or len(furigana_by_word) != 100 or set(words) != set(furigana_by_word):
    raise ValueError("N2 후리가나 예문은 단어와 일치하는 100개여야 합니다.")
if not all(furigana_by_word[word].count("___") == 1 and "<ruby>" in furigana_by_word[word] for word in words):
    raise ValueError("각 N2 후리가나 예문에는 빈칸과 ruby 표기가 있어야 합니다.")

exported = [
    {
        "id": f"n2-{index:03d}",
        "level": "N2",
        **item,
        "sentence": sentence_by_word[item["word"]],
        "sentenceFurigana": furigana_by_word[item["word"]],
        "sentenceTranslation": translation_by_word[item["word"]],
    }
    for index, item in enumerate(items, start=1)
]

# Keep the original 100 records (and their IDs/sentences) unchanged so saved
# progress survives the import. Workbook IDs use source positions, not sorting.
workbook = json.loads(workbook_source.read_text(encoding="utf-8"))
workbook_items = workbook["items"]
if sum(len(item["positions"]) for item in workbook_items) != workbook["sourceItemCount"]:
    raise ValueError("N2 연습장 원본 항목 수와 위치 정보가 일치하지 않습니다.")
positions = [(pos["day"], pos["number"]) for item in workbook_items for pos in item["positions"]]
if set(positions) != {(day, number) for day in range(1, 46) for number in range(1, 26)} or len(positions) != 1125:
    raise ValueError("N2 연습장 45일분의 원본 항목에 누락 또는 중복이 있습니다.")
if len({item["id"] for item in workbook_items}) != len(workbook_items):
    raise ValueError("N2 연습장 ID가 중복되어 있습니다.")
seen_words = {word_key(item["word"]) for item in exported}
skipped = 0
for item in workbook_items:
    if not all(isinstance(item.get(key), str) and item[key].strip()
               for key in ("id", "word", "reading", "meaning")):
        raise ValueError(f"N2 연습장 필수 정보 누락: {item.get('id')}")
    if not re.fullmatch(r"n2-workbook-\d{4}", item["id"]):
        raise ValueError(f"N2 연습장 ID 형식 오류: {item['id']}")
    if not all(re.fullmatch(r"[ぁ-ゖー]+", reading.strip()) for reading in item["reading"].split("/")):
        raise ValueError(f"N2 연습장 읽기 형식 오류: {item['word']}")
    if not item["positions"] or any(
        not 2 <= pos["page"] <= 91 or pos["day"] != pos["page"] // 2
        or not 1 <= pos["number"] <= 25 for pos in item["positions"]
    ):
        raise ValueError(f"N2 연습장 출처 위치 오류: {item['word']}")
    key = word_key(item["word"])
    if key in seen_words:
        skipped += 1
        continue
    seen_words.add(key)
    position = item["positions"][0]
    # This problem-only workbook contains no example sentences. Do not invent
    # sentence fields: the app's sentence mode selects complete examples only.
    exported.append({
        **{key: item[key] for key in ("id", "word", "reading", "meaning")},
        "level": "N2",
        "day": position["day"],
        "source": f"한끝 N2 단어연습장 · DAY {position['day']:02d} · p.{position['page']}",
    })
if len({item["id"] for item in exported}) != len(exported):
    raise ValueError("기존 단어와 신규 단어의 ID가 충돌합니다.")

javascript = "globalThis.N2_VOCAB_DATA = " + json.dumps(
    exported,
    ensure_ascii=False,
    separators=(",", ":"),
) + ";\n"
output.write_text(javascript, encoding="utf-8")
print(f"exported {len(exported)} N2 words to {output}")
print(f"workbook: {len(workbook_items) - skipped} added, {skipped} duplicates skipped")
