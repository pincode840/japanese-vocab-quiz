import bz2
import json
import re
from collections import Counter
from pathlib import Path


DATA_PATH = Path("n3_vocab_curated.json")
TATOEBA_DIR = Path("tmp/tatoeba")
KANJI_RE = re.compile(r"[一-龯々〆ヵヶ]")
HANGUL_RE = re.compile(r"[가-힣]")


def read_sentences(path):
    result = {}
    with bz2.open(path, "rt", encoding="utf-8") as source:
        for line in source:
            sentence_id, _language, sentence = line.rstrip("\n").split("\t", 2)
            result[int(sentence_id)] = sentence
    return result


def attribution_id(url):
    return int(url.rstrip("/").rsplit("/", 1)[-1])


def main():
    items = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    sentence_items = [item for item in items if item.get("sentence")]
    if len(sentence_items) != 500:
        raise ValueError(f"N3 문장 문제는 500개여야 합니다: {len(sentence_items)}")
    if len({item["id"] for item in sentence_items}) != 500:
        raise ValueError("N3 문장 문제 ID가 중복되었습니다.")
    if len({item["sentence"] for item in sentence_items}) != 500:
        duplicates = [
            sentence for sentence, count in Counter(item["sentence"] for item in sentence_items).items()
            if count > 1
        ]
        raise ValueError(f"빈칸 문장이 중복되었습니다: {duplicates[:3]}")

    invalid = [
        item["word"] for item in sentence_items
        if item["sentence"].count("___") != 1
        or item["sentenceFurigana"].count("___") != 1
        or not HANGUL_RE.search(item["sentenceTranslation"])
        or not 7 <= len(item["sentence"]) <= 75
    ]
    if invalid:
        raise ValueError(f"형식이 잘못된 N3 문장 문제: {', '.join(invalid[:10])}")

    japanese = read_sentences(TATOEBA_DIR / "jpn_sentences.tsv.bz2")
    korean = read_sentences(TATOEBA_DIR / "kor_sentences.tsv.bz2")
    tatoeba_items = [item for item in sentence_items if item.get("sentenceAttribution")]
    if len(tatoeba_items) != 465:
        raise ValueError(f"Tatoeba 기반 예문은 465개여야 합니다: {len(tatoeba_items)}")

    used_japanese_ids = set()
    for item in tatoeba_items:
        japanese_id = attribution_id(item["sentenceAttribution"])
        if japanese_id in used_japanese_ids:
            raise ValueError(f"Tatoeba 일본어 예문 ID가 중복되었습니다: {japanese_id}")
        used_japanese_ids.add(japanese_id)
        surface = item.get("sentenceSurface")
        if not surface:
            raise ValueError(f"빈칸 표면형이 없습니다: {item['word']}")
        original = item["sentence"].replace("___", surface)
        if japanese.get(japanese_id) != original:
            raise ValueError(f"Tatoeba 일본어 원문과 일치하지 않습니다: {item['word']}")
        if item.get("sentenceTranslationAttribution"):
            korean_id = attribution_id(item["sentenceTranslationAttribution"])
            if korean.get(korean_id) != item["sentenceTranslation"]:
                raise ValueError(f"Tatoeba 한국어 번역과 일치하지 않습니다: {item['word']}")
        if item.get("sentenceLicense") != "CC BY 2.0 FR":
            raise ValueError(f"Tatoeba 라이선스가 없습니다: {item['word']}")

    source_counts = Counter(item.get("sentenceSource", "") for item in sentence_items)
    ruby_count = sum("<ruby>" in item["sentenceFurigana"] for item in sentence_items)
    kanji_context_count = sum(KANJI_RE.search(item["sentence"].replace("___", "")) is not None for item in sentence_items)
    print(f"N3 sentence audit passed: {len(sentence_items)} unique items")
    print(f"sources: {dict(source_counts)}")
    print(f"furigana sentences: {ruby_count}; kanji contexts: {kanji_context_count}")


if __name__ == "__main__":
    main()
