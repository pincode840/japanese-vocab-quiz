import json
from pathlib import Path


source = Path("n2_vocab_curated.json")
sentence_source = Path("n2_sentences.json")
translation_source = Path("n2_sentence_translations.json")
furigana_source = Path("n2_sentence_furigana.json")
output = Path("japanese-vocab-quiz/n2-vocab-data.js")

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

javascript = "globalThis.N2_VOCAB_DATA = " + json.dumps(
    exported,
    ensure_ascii=False,
    separators=(",", ":"),
) + ";\n"
output.write_text(javascript, encoding="utf-8")
print(f"exported {len(exported)} N2 words to {output}")
