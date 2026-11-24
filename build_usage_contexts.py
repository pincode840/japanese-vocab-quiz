"""Build supplementary, attributed Japanese examples from Tatoeba snapshots."""

import argparse
import bz2
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from heapq import heappush, heapreplace
import json
from pathlib import Path
import re
import subprocess
import sys
import tarfile
import unicodedata


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "japanese-vocab-quiz"
CORPUS = ROOT / "tmp" / "tatoeba"
JANOME_PATH = ROOT / "tmp" / "janome"
if JANOME_PATH.is_dir():
    sys.path.insert(0, str(JANOME_PATH))

from janome.tokenizer import Tokenizer  # noqa: E402


READING_SEPARATOR = re.compile(r"[/／、,・；;\s]+")
HIRAGANA = re.compile(r"[ぁ-ゖー]+\Z")
UNSUITABLE = re.compile(
    r"__|<|>|https?:|[A-Z]{3,}|[0-9]{4,}|セックス|レイプ|強姦|凌辱|性的|性行為|"
    r"殺人|殺す|殺した|殺され|殺し|殺害|自殺|心中|死ね|自傷|テロ|爆弾|"
    r"拳銃|ピストル|麻薬|ヘロイン|コカイン|マリファナ|売春|暴力|虐待|ナチス|"
    r"クソ|糞|馬鹿野郎|バカ野郎|ブス|エロ|下着|裸[体でに]"
)
# Same spelling and/or reading can imply distinct senses. These need a curated
# example (or an existing example tied to the glossary), not an automatic one.
NEEDS_REVIEW = {"空", "直に", "抱く", "包む", "方々"}
MARKER = re.compile(r"___|＿＿＿")


def to_kana(value):
    return "".join(chr(ord(c) - 96) if "ァ" <= c <= "ヶ" else c
                   for c in unicodedata.normalize("NFKC", value))


def readings(item):
    return {s for s in READING_SEPARATOR.split(to_kana(item["reading"])) if HIRAGANA.fullmatch(s)}


def load_data(node):
    code = """
    for (const file of ["vocab-data","n3-vocab-data","n2-vocab-data","katakana-vocab-data","usage-context-curated"])
      require("./japanese-vocab-quiz/" + file + ".js");
    console.log(JSON.stringify({
      items: [...VOCAB_DATA, ...N3_VOCAB_DATA, ...N2_VOCAB_DATA, ...KATAKANA_VOCAB_DATA],
      curated: Object.keys(JLPT_CURATED_USAGE_EXAMPLES),
    }));
    """
    result = subprocess.check_output([node, "-e", code], cwd=ROOT, encoding="utf-8")
    return json.loads(result)


@contextmanager
def open_rows(path):
    """Support the official .tar.bz2 downloads or standalone .tsv.bz2 files."""
    if path.name.endswith(".tar.bz2"):
        with tarfile.open(path, "r|bz2") as archive:
            member = next(item for item in archive if item.isfile())
            with archive.extractfile(member) as source:
                yield source
    else:
        with bz2.open(path, "rb") as source:
            yield source


def read_rows(path):
    with open_rows(path) as source:
        for row in source:
            yield row.decode("utf-8").rstrip("\r\n").split("\t")


def load_linked_ids(path):
    return {int(row[0]) for row in read_rows(path)} if path.is_file() else set()


def candidates_to_fill(data):
    existing = defaultdict(list)
    for item in data["items"]:
        if usable_context(item, item.get("sentence"), item.get("sentenceSurface") or item["word"]):
            existing[item["word"]].append((readings(item), item["meaning"]))

    result = []
    reused_ids = []
    curated = set(data["curated"])
    for item in data["items"]:
        if (usable_context(item, item.get("sentence"), item.get("sentenceSurface") or item["word"])
                or usable_context(item, item.get("readingContext"), item["word"]) or item["id"] in curated):
            continue
        if any(readings(item) == yomi and item["meaning"] == gloss
               for yomi, gloss in existing[item["word"]]):
            reused_ids.append(item["id"])
            continue
        result.append(item)
    return result, reused_ids


def usable_context(item, cloze, surface):
    parts = MARKER.split(cloze or "")
    return len(parts) == 2 and not any(surface in part or item["word"] in part for part in parts)


def index_items(items):
    exact = defaultdict(dict)
    inflected = defaultdict(dict)
    for item in items:
        word = item["word"].strip("〜～~")
        yomi = readings(item)
        if not yomi or not word or word in NEEDS_REVIEW:
            continue
        exact[word][item["id"]] = yomi
        inflected[word][item["id"]] = yomi
        if word.endswith("だ") and len(word) > 1:
            stem_yomi = {r[:-1] for r in yomi if r.endswith("だ") and len(r) > 1}
            if stem_yomi:
                exact[word[:-1]][item["id"]] = stem_yomi
    return exact, inflected


def inflection_matches(lemma, surface, dictionary_yomi, actual_yomi):
    # Require the unchanged spelling prefix and a fully kana suffix. Irregular
    # substitutions such as 来る → 来 (き) are not accepted by suffix guessing.
    common = 0
    while common < min(len(lemma), len(surface)) and lemma[common] == surface[common]:
        common += 1
    if not common:
        return False
    original_suffix = to_kana(lemma[common:])
    new_suffix = to_kana(surface[common:])
    if not HIRAGANA.fullmatch(original_suffix) or (new_suffix and not HIRAGANA.fullmatch(new_suffix)):
        return False
    return dictionary_yomi.endswith(original_suffix) and (
        dictionary_yomi[:-len(original_suffix)] + new_suffix == actual_yomi
    )


def make_prefixes(exact, inflected):
    # Quick substring gate before morphological analysis. Include stems of
    # regular Japanese headwords so conjugated forms can reach the tokenizer.
    values = set(exact)
    for word in inflected:
        if len(word) > 1 and HIRAGANA.fullmatch(to_kana(word[-1])):
            values.add(word[:-1])
    return re.compile("|".join(map(re.escape, sorted(values, key=lambda v: (-len(v), v)))))


def find_matches(sentence, tokenizer, exact, inflected, lengths):
    spans = []
    offset = 0
    for token in tokenizer.tokenize(sentence):
        start = offset
        offset += len(token.surface)
        yomi = to_kana(token.reading)
        if yomi == "*" and HIRAGANA.fullmatch(to_kana(token.surface)):
            yomi = to_kana(token.surface)
        spans.append((start, offset, token.base_form, yomi))
    boundary = {start: i for i, (start, _, _, _) in enumerate(spans)}
    boundary[offset] = len(spans)
    found = defaultdict(set)
    for i, (start, end, base, yomi) in enumerate(spans):
        surface = sentence[start:end]
        for n in lengths:
            target_end = start + n
            target = exact.get(sentence[start:target_end]) if target_end in boundary else None
            if not target:
                continue
            full_yomi = "".join(part[3] for part in spans[i:boundary[target_end]])
            if not HIRAGANA.fullmatch(full_yomi):
                continue
            for item_id, known in target.items():
                if full_yomi in known:
                    found[item_id].add((start, target_end, True))
        if surface == base or not HIRAGANA.fullmatch(yomi):
            continue
        for item_id, known in inflected.get(base, {}).items():
            if any(inflection_matches(base, surface, r, yomi) for r in known):
                found[item_id].add((start, end, False))
    for item_id, locations in found.items():
        # Reject sentences with multiple occurrences, including inflections.
        positions = {(start, end) for start, end, _ in locations}
        if len(positions) == 1:
            start, end = next(iter(positions))
            yield item_id, start, end, (start, end, True) in locations


def collect_examples(items, corpus):
    by_id = {item["id"]: item for item in items}
    exact, inflected = index_items(items)
    gate = make_prefixes(exact, inflected)
    lengths = sorted({len(word) for word in exact})
    tokenizer = Tokenizer()
    korean_links = load_linked_ids(corpus / "jpn-kor_links.tsv.bz2")
    english_links = load_linked_ids(corpus / "jpn-eng_links.tsv.bz2")
    candidates = defaultdict(list)
    top_count = 6
    for row in read_rows(corpus / "jpn_sentences.tsv.bz2"):
        if len(row) != 3:
            continue
        numeric_id, _, sentence = int(row[0]), row[1], row[2]
        if (not 9 <= len(sentence) <= 52 or sentence[-1] not in "。？！"
                or UNSUITABLE.search(sentence) or not gate.search(sentence)
                or any(character.isspace() for character in sentence)):
            continue
        for item_id, start, end, exact_form in find_matches(
            sentence, tokenizer, exact, inflected, lengths
        ):
            target = sentence[start:end]
            cloze = sentence[:start] + "＿＿＿" + sentence[end:]
            if not usable_context(by_id[item_id], cloze, target):
                continue
            # Prefer complete, concise sentences containing the written form.
            # Linked translations help rank material but are not republished.
            score = (
                (10 if exact_form else 0)
                + (3 if numeric_id in english_links else 0)
                + (3 if numeric_id in korean_links else 0)
                - abs(21 - len(sentence)) / 3
                - (4 if re.search(r"トム|メアリー|ジョン|ジャック", sentence) else 0)
                - (2 if sentence[-1] != "。" else 0)
            )
            record = (score, -numeric_id, sentence, cloze, target)
            heap = candidates[item_id]
            if len(heap) < top_count:
                heappush(heap, record)
            elif record > heap[0]:
                heapreplace(heap, record)
    return candidates


def load_provenance(corpus):
    cc0_sentences = {
        int(row[0]): row[2] for row in read_rows(corpus / "sentences_CC0.tar.bz2")
        if len(row) >= 3 and row[1] == "jpn"
    }
    provenance = {}
    for row in read_rows(corpus / "sentences_detailed.tar.bz2"):
        if len(row) < 4 or row[1] != "jpn":
            continue
        numeric_id = int(row[0])
        author = row[3].strip()
        is_cc0 = cc0_sentences.get(numeric_id) == row[2]
        if not is_cc0 and (not author or author == r"\N"):
            continue
        provenance[numeric_id] = {
            "originalText": row[2],
            "sourceId": numeric_id,
            "sourceLicense": "CC0 1.0" if is_cc0 else "CC BY 2.0 FR",
        }
        if author and author != r"\N":
            provenance[numeric_id]["sourceAuthor"] = author
    return provenance


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--node", default="node")
    parser.add_argument("--corpus", type=Path, default=CORPUS)
    args = parser.parse_args()
    items, reused_ids = candidates_to_fill(load_data(args.node))
    print(f"Scanning Japanese sentences for {len(items)} items (reusing {len(reused_ids)} contexts).", flush=True)
    with ThreadPoolExecutor(max_workers=1) as executor:
        provenance_task = executor.submit(load_provenance, args.corpus)
        candidates = collect_examples(items, args.corpus)
        print(f"Found candidates for {len(candidates)} items. Checking original author and text.", flush=True)
        provenance = provenance_task.result()
    examples = {}
    used = set()
    for item in items:
        ranked = sorted(candidates[item["id"]], reverse=True)
        for _, negated_id, original, cloze, target in ranked:
            numeric_id = -negated_id
            source = provenance.get(numeric_id)
            if source and source["originalText"] == original and numeric_id not in used:
                examples[item["id"]] = {
                    "sentence": cloze,
                    "blank": target,
                    **{key: value for key, value in source.items() if key != "originalText"},
                }
                used.add(numeric_id)
                break
    data = json.dumps(examples, ensure_ascii=False, indent=2)
    (DATA_PATH / "usage-context-data.js").write_text(
        "// Generated by build_usage_contexts.py. Source: Tatoeba.\n"
        "globalThis.JLPT_USAGE_EXAMPLES = " + data + ";\n",
        encoding="utf-8",
    )
    print(f"Added {len(examples)} attributed examples; {len(items) - len(examples)} words still lack context.")


if __name__ == "__main__":
    main()
