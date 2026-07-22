import html
import json
import re
import sys
from pathlib import Path


JANOME_PATH = Path("tmp/janome")
if JANOME_PATH.exists():
    sys.path.insert(0, str(JANOME_PATH.resolve()))

from janome.tokenizer import Tokenizer  # noqa: E402


KANJI_PATTERN = re.compile(r"[一-龯々〆ヵヶ]")
FURIGANA_OVERRIDES = {
    "怪しい": {
        "<ruby>夜中<rt>やちゅう</rt></ruby>": "<ruby>夜中<rt>よなか</rt></ruby>",
        "<ruby>人<rt>じん</rt></ruby>": "<ruby>人<rt>ひと</rt></ruby>",
    },
    "息抜き": {
        "<ruby>後<rt>のち</rt></ruby>": "<ruby>後<rt>あと</rt></ruby>",
    },
    "象徴": {
        "<ruby>日本<rt>にっぽん</rt></ruby>": "<ruby>日本<rt>にほん</rt></ruby>",
    },
    "激しい": {
        "<ruby>雨<rt>う</rt></ruby>": "<ruby>雨<rt>あめ</rt></ruby>",
    },
    "以来": {
        "<ruby>日本<rt>にっぽん</rt></ruby>": "<ruby>日本<rt>にほん</rt></ruby>",
    },
    "施設": {
        "<ruby>九<rt>きゅう</rt></ruby>": "<ruby>九<rt>く</rt></ruby>",
    },
    "発生": {
        "<ruby>後<rt>のち</rt></ruby>": "<ruby>後<rt>あと</rt></ruby>",
    },
}


def katakana_to_hiragana(text):
    return "".join(
        chr(ord(character) - 0x60) if "ァ" <= character <= "ヶ" else character
        for character in text
    )


def add_furigana(sentence, tokenizer):
    parts = []
    for token in tokenizer.tokenize(sentence):
        surface = token.surface
        reading = token.reading
        escaped_surface = html.escape(surface)
        if KANJI_PATTERN.search(surface) and reading != "*":
            escaped_reading = html.escape(katakana_to_hiragana(reading))
            parts.append(f"<ruby>{escaped_surface}<rt>{escaped_reading}</rt></ruby>")
        else:
            parts.append(escaped_surface)
    return "".join(parts)


def apply_overrides(word, furigana):
    for original, replacement in FURIGANA_OVERRIDES.get(word, {}).items():
        furigana = furigana.replace(original, replacement)
    return furigana


source = Path("n2_sentences.json")
output = Path("n2_sentence_furigana.json")
sentences = json.loads(source.read_text(encoding="utf-8"))
tokenizer = Tokenizer()

result = [
    {
        "word": item["word"],
        "furigana": apply_overrides(item["word"], add_furigana(item["sentence"], tokenizer)),
    }
    for item in sentences
]

if len(result) != 100 or len({item["word"] for item in result}) != 100:
    raise ValueError("후리가나 예문은 중복 없이 100개여야 합니다.")
if not all(item["furigana"].count("___") == 1 for item in result):
    raise ValueError("각 후리가나 예문에는 빈칸 표시(___)가 정확히 하나 있어야 합니다.")

output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"generated furigana for {len(result)} N2 sentences")
