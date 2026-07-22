import json
from pathlib import Path

from enrich_n3_sentences import (
    TATOEBA_DIR,
    UNSUITABLE_RE,
    candidate_score,
    find_surface,
    read_links,
    read_sentence_file,
    token_spans,
)
from janome.tokenizer import Tokenizer


DATA_PATH = Path("n3_vocab_curated.json")
JPN_ENG_LINKS = TATOEBA_DIR / "jpn-eng_links.tsv.bz2"
ENG_SENTENCES = TATOEBA_DIR / "eng_sentences.tsv.bz2"
OUTPUT = TATOEBA_DIR / "n3_english_candidates.json"


def main():
    items = [
        item for item in json.loads(DATA_PATH.read_text(encoding="utf-8"))
        if not item.get("sentence") and len(item["word"]) >= 2
    ]
    links = read_links(JPN_ENG_LINKS)
    linked_japanese_ids = {japanese_id for japanese_id, _english_id in links}
    linked_english_ids = {english_id for _japanese_id, english_id in links}
    japanese = {
        sentence_id: sentence
        for sentence_id, sentence in read_sentence_file(TATOEBA_DIR / "jpn_sentences.tsv.bz2").items()
        if sentence_id in linked_japanese_ids
    }
    english = {
        sentence_id: sentence
        for sentence_id, sentence in read_sentence_file(ENG_SENTENCES).items()
        if sentence_id in linked_english_ids
    }
    translations = {}
    for japanese_id, english_id in links:
        if japanese_id in japanese and english_id in english:
            translations.setdefault(japanese_id, []).append((english_id, english[english_id]))

    tokenizer = Tokenizer()
    candidates = []
    used_japanese_ids = set()
    for item in items:
        word = item["word"]
        stem = word[:-1] if word.endswith("だ") else word
        options = []
        for japanese_id, sentence in japanese.items():
            if word not in sentence and stem not in sentence:
                continue
            if not 8 <= len(sentence) <= 65 or UNSUITABLE_RE.search(sentence):
                continue
            match = find_surface(word, sentence, token_spans(sentence, tokenizer))
            if match is None:
                continue
            start, end, surface, exact = match
            for english_id, translation in translations.get(japanese_id, []):
                if 5 <= len(translation) <= 110:
                    options.append({
                        "itemId": item["id"],
                        "word": word,
                        "japaneseId": japanese_id,
                        "englishId": english_id,
                        "sentenceOriginal": sentence,
                        "surface": surface,
                        "sentence": sentence[:start] + "___" + sentence[end:],
                        "english": translation,
                        "score": candidate_score(word, sentence, exact),
                    })
        options.sort(key=lambda option: (-option["score"], option["japaneseId"], option["englishId"]))
        selected = next((option for option in options if option["japaneseId"] not in used_japanese_ids), None)
        if selected:
            candidates.append(selected)
            used_japanese_ids.add(selected["japaneseId"])

    candidates.sort(key=lambda option: (-option["score"], option["word"]))
    OUTPUT.write_text(json.dumps(candidates, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(candidates)} English candidates to {OUTPUT}")
    for option in candidates[:80]:
        print(
            f"{option['itemId']}\t{option['word']}\t{option['sentenceOriginal']}\t{option['english']}\t"
            f"{option['japaneseId']}:{option['englishId']}"
        )


if __name__ == "__main__":
    main()
