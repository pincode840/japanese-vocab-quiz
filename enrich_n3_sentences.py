import bz2
import html
import json
import re
import sys
from collections import defaultdict
from pathlib import Path


JANOME_PATH = Path("tmp/janome")
if JANOME_PATH.exists():
    sys.path.insert(0, str(JANOME_PATH.resolve()))

from janome.tokenizer import Tokenizer  # noqa: E402


TARGET_TOTAL = 500
DATA_PATH = Path("n3_vocab_curated.json")
OUTPUT_JS = Path("japanese-vocab-quiz/n3-vocab-data.js")
TATOEBA_DIR = Path("tmp/tatoeba")
JPN_SENTENCES = TATOEBA_DIR / "jpn_sentences.tsv.bz2"
KOR_SENTENCES = TATOEBA_DIR / "kor_sentences.tsv.bz2"
JPN_KOR_LINKS = TATOEBA_DIR / "jpn-kor_links.tsv.bz2"
AUDIT_PATH = TATOEBA_DIR / "n3_sentence_audit.json"

KANJI_RE = re.compile(r"[一-龯々〆ヵヶ]")
UNSUITABLE_RE = re.compile(
    r"トム|メアリー|ボストン|シカゴ|ニューヨーク|フランス|ドイツ|アメリカ|"
    r"殺|死刑|セックス|麻薬|自殺|裸|レイプ"
)

ENGLISH_REFERENCE_FALLBACKS = [
    {
        "itemId": "n3-1007", "word": "公共交通機関", "surface": "公共交通機関",
        "japaneseId": 10906882, "englishId": 6070337,
        "sentenceOriginal": "フィンランドの公共交通機関は時間を正確に守る。",
        "translation": "핀란드의 대중교통은 항상 시간을 정확히 지킨다.",
    },
    {
        "itemId": "n3-1231", "word": "当たり前だ", "surface": "当たり前だ",
        "japaneseId": 234694, "englishId": 72072,
        "sentenceOriginal": "ああ遊んでいては彼が試験に落ちるのも当たり前だ。",
        "translation": "그렇게 놀기만 했으니 그가 시험에 떨어진 것도 당연하다.",
    },
    {
        "itemId": "n3-0813", "word": "終わらせる", "surface": "終わらせる",
        "japaneseId": 156525, "englishId": 258009,
        "sentenceOriginal": "私は思ったより早く仕事を終わらせることができた。",
        "translation": "나는 생각했던 것보다 빨리 일을 끝낼 수 있었다.",
    },
    {
        "itemId": "n3-0884", "word": "受け入れる", "surface": "受け入れる",
        "japaneseId": 217053, "englishId": 54360,
        "sentenceOriginal": "ご提案を受け入れることができず、たいへん残念です。",
        "translation": "제안을 받아들일 수 없어 매우 유감입니다.",
    },
    {
        "itemId": "n3-0558", "word": "待ち合わせ", "surface": "待ち合わせ",
        "japaneseId": 158263, "englishId": 256267,
        "sentenceOriginal": "私は駅の近くにある喫茶店で彼女と待ち合わせた。",
        "translation": "나는 역 근처에 있는 찻집에서 그녀와 만나기로 했다.",
    },
    {
        "itemId": "n3-0634", "word": "打ち合わせ", "surface": "打ち合わせ",
        "japaneseId": 185887, "englishId": 23019,
        "sentenceOriginal": "我々は月曜日の午後６時に会う打ち合わせをした。",
        "translation": "우리는 월요일 오후 6시에 만나기로 협의했다.",
    },
    {
        "itemId": "n3-1196", "word": "申し訳ない", "surface": "申し訳ない",
        "japaneseId": 9194930, "englishId": 52229,
        "sentenceOriginal": "申し訳ないんですけど、今すぐの回答は無理なんです。",
        "translation": "죄송하지만 지금 바로 답변드리기는 어렵습니다.",
    },
    {
        "itemId": "n3-0841", "word": "相変わらず", "surface": "相変わらず",
        "japaneseId": 86018, "englishId": 317693,
        "sentenceOriginal": "彼等は意見を異にするのに、相変わらず仲が良い。",
        "translation": "그들은 의견이 다르지만 여전히 사이가 좋다.",
    },
    {
        "itemId": "n3-0900", "word": "話しかける", "surface": "話しかける",
        "japaneseId": 156526, "englishId": 258008,
        "sentenceOriginal": "私は思い切って彼女に話しかけることができない。",
        "translation": "나는 용기를 내어 그녀에게 말을 걸 수가 없다.",
    },
    {
        "itemId": "n3-0906", "word": "身につける", "surface": "身につける",
        "japaneseId": 189060, "englishId": 26208,
        "sentenceOriginal": "英語を身につける最良の方法は何だと思いますか。",
        "translation": "영어를 익히는 가장 좋은 방법은 무엇이라고 생각합니까?",
    },
    {
        "itemId": "n3-0896", "word": "通り過ぎる", "surface": "通り過ぎる",
        "japaneseId": 10993216, "englishId": 11114898,
        "sentenceOriginal": "彼らのそばを通り過ぎるとき、僕は立ち止まった。",
        "translation": "그들 곁을 지나갈 때 나는 걸음을 멈췄다.",
    },
    {
        "itemId": "n3-1103", "word": "乗り換える", "surface": "乗り換える",
        "japaneseId": 192950, "englishId": 30115,
        "sentenceOriginal": "ユナイテッドの１１１便に乗り換えるのですが。",
        "translation": "유나이티드 항공 111편으로 갈아타야 하는데요.",
    },
    {
        "itemId": "n3-1033", "word": "自動車会社", "surface": "自動車会社",
        "japaneseId": 209689, "englishId": 46951,
        "sentenceOriginal": "その自動車会社は３００人もの労働者を一時帰休させた。",
        "translation": "그 자동차 회사는 무려 300명의 노동자를 일시 해고했다.",
    },
    {
        "itemId": "n3-0911", "word": "お互いに", "surface": "お互いに",
        "japaneseId": 98771, "englishId": 304929,
        "sentenceOriginal": "彼らがお互いに愛し合っているのを僕は知っている。",
        "translation": "나는 그들이 서로 사랑하고 있다는 것을 알고 있다.",
    },
    {
        "itemId": "n3-0723", "word": "引き受ける", "surface": "引き受ける",
        "japaneseId": 173221, "englishId": 241250,
        "sentenceOriginal": "高給なので彼はその地位を引き受ける気になった。",
        "translation": "보수가 높아서 그는 그 직책을 맡을 마음이 생겼다.",
    },
    {
        "itemId": "n3-0949", "word": "お知らせ", "surface": "お知らせ",
        "japaneseId": 4933, "englishId": 1522,
        "sentenceOriginal": "何か私にできることがありましたらお知らせ下さい。",
        "translation": "제가 할 수 있는 일이 있으면 알려 주세요.",
    },
    {
        "itemId": "n3-0829", "word": "やり直す", "surface": "やり直す",
        "japaneseId": 194545, "englishId": 31718,
        "sentenceOriginal": "もう１度人生をやり直すとすれば音楽家になりたい。",
        "translation": "인생을 다시 살 수 있다면 음악가가 되고 싶다.",
    },
    {
        "itemId": "n3-1009", "word": "交通事故", "surface": "交通事故",
        "japaneseId": 199237, "englishId": 36439,
        "sentenceOriginal": "なぜなら、今年に５回も交通事故を起こしています。",
        "translation": "왜냐하면 올해만 교통사고를 다섯 번이나 냈기 때문입니다.",
    },
    {
        "itemId": "n3-0854", "word": "前もって", "surface": "前もって",
        "japaneseId": 126081, "englishId": 277911,
        "sentenceOriginal": "聴講切符を前もって入手しておかなければならない。",
        "translation": "청강권을 미리 구해 두어야 한다.",
    },
    {
        "itemId": "n3-0916", "word": "受け取る", "surface": "受け取る",
        "japaneseId": 206748, "englishId": 43996,
        "sentenceOriginal": "その法律は我々に年金を受け取る権利を与えている。",
        "translation": "그 법은 우리에게 연금을 받을 권리를 부여한다.",
    },
    {
        "itemId": "n3-1116", "word": "引き出し", "surface": "引き出し",
        "japaneseId": 125373, "englishId": 278620,
        "sentenceOriginal": "泥棒たちはお金を捜して机の引き出しを全部開けた。",
        "translation": "도둑들은 돈을 찾으려고 책상의 서랍을 전부 열었다.",
    },
    {
        "itemId": "n3-0305", "word": "恐ろしい", "surface": "恐ろしい",
        "japaneseId": 141486, "englishId": 273084,
        "sentenceOriginal": "先日、そのにぎやかな広場で恐ろしい事が起こった。",
        "translation": "며칠 전 그 번화한 광장에서 무서운 일이 일어났다.",
    },
    {
        "itemId": "n3-0318", "word": "懐かしい", "surface": "懐かしい",
        "japaneseId": 142427, "englishId": 272143,
        "sentenceOriginal": "昔の懐かしい思い出が次々と私の胸によみがえった。",
        "translation": "옛날의 그리운 추억이 잇따라 내 가슴속에 되살아났다.",
    },
    {
        "itemId": "n3-0925", "word": "携帯電話", "surface": "携帯電話",
        "japaneseId": 1502351, "englishId": 10250986,
        "sentenceOriginal": "携帯電話と便座は同じくらいの菌に汚染されている。",
        "translation": "휴대전화는 변기 시트만큼 세균에 오염되어 있다.",
    },
    {
        "itemId": "n3-0814", "word": "整理する", "surface": "整理する",
        "japaneseId": 196310, "englishId": 33488,
        "sentenceOriginal": "ぼくは出かける前に自分の本を整理する時間がない。",
        "translation": "나는 나가기 전에 내 책을 정리할 시간이 없다.",
    },
    {
        "itemId": "n3-0800", "word": "暗記する", "surface": "暗記する",
        "japaneseId": 157018, "englishId": 257516,
        "sentenceOriginal": "私は今週末までにこの詩を暗記するように言われた。",
        "translation": "나는 이번 주말까지 이 시를 암기하라는 말을 들었다.",
    },
    {
        "itemId": "n3-0818", "word": "注文する", "surface": "注文する",
        "japaneseId": 126398, "englishId": 277592,
        "sentenceOriginal": "昼食のメニューの中から注文するには早すぎますか。",
        "translation": "점심 메뉴에서 주문하기에는 너무 이른가요?",
    },
    {
        "itemId": "n3-0356", "word": "申し込み", "surface": "申し込み",
        "japaneseId": 91471, "englishId": 312242,
        "sentenceOriginal": "彼女はまだ彼の結婚の申し込みを受け入れていない。",
        "translation": "그녀는 아직 그의 청혼을 받아들이지 않았다.",
    },
]

QUALITY_OVERRIDES = {
    "n3-0319": {
        "word": "激しい",
        "surface": "激しい",
        "japaneseId": 97281,
        "englishId": 306421,
        "sentenceOriginal": "彼らは激しい議論を始めた。",
        "translation": "그들은 격렬한 토론을 시작했다.",
    },
    "n3-1151": {
        "word": "暇",
        "translation": "일요일은 한가합니다.",
    },
}


def read_sentence_file(path):
    result = {}
    with bz2.open(path, "rt", encoding="utf-8") as source:
        for line in source:
            sentence_id, _language, sentence = line.rstrip("\n").split("\t", 2)
            result[int(sentence_id)] = sentence
    return result


def read_links(path):
    result = []
    with bz2.open(path, "rt", encoding="utf-8") as source:
        for line in source:
            left, right = line.rstrip("\n").split("\t")
            result.append((int(left), int(right)))
    return result


def katakana_to_hiragana(text):
    return "".join(
        chr(ord(character) - 0x60) if "ァ" <= character <= "ヶ" else character
        for character in text
    )


def add_furigana(sentence, tokenizer):
    parts = []
    for token in tokenizer.tokenize(sentence):
        surface = token.surface
        escaped_surface = html.escape(surface)
        if KANJI_RE.search(surface) and token.reading != "*":
            reading = html.escape(katakana_to_hiragana(token.reading))
            parts.append(f"<ruby>{escaped_surface}<rt>{reading}</rt></ruby>")
        else:
            parts.append(escaped_surface)
    return "".join(parts)


def token_spans(sentence, tokenizer):
    spans = []
    cursor = 0
    for token in tokenizer.tokenize(sentence):
        start = sentence.find(token.surface, cursor)
        if start < 0:
            continue
        end = start + len(token.surface)
        spans.append({
            "surface": token.surface,
            "base": token.base_form,
            "start": start,
            "end": end,
        })
        cursor = end
    return spans


def find_surface(word, sentence, spans):
    boundaries = {0, len(sentence)}
    for span in spans:
        boundaries.add(span["start"])
        boundaries.add(span["end"])

    exact_matches = []
    start = sentence.find(word)
    while start >= 0:
        end = start + len(word)
        if start in boundaries and end in boundaries:
            exact_matches.append((start, end, word, True))
        start = sentence.find(word, start + 1)
    if len(exact_matches) == 1:
        return exact_matches[0]

    base_matches = [
        (span["start"], span["end"], span["surface"], False)
        for span in spans
        if span["base"] == word
    ]
    if len(base_matches) == 1:
        return base_matches[0]

    if word.endswith("だ"):
        stem = word[:-1]
        stem_matches = [
            (span["start"], span["end"], span["surface"], False)
            for span in spans
            if span["surface"] == stem or span["base"] == stem
        ]
        if len(stem_matches) == 1:
            return stem_matches[0]
    return None


def candidate_score(word, sentence, exact):
    score = 120 if exact else 100
    score += min(len(word), 8) * 3
    score -= abs(len(sentence) - 24)
    if sentence.endswith(("。", "？", "！")):
        score += 4
    return score


def make_candidates(items, Japanese, Korean, links, tokenizer):
    translations = defaultdict(list)
    for japanese_id, korean_id in links:
        if japanese_id in Japanese and korean_id in Korean:
            translations[japanese_id].append((korean_id, Korean[korean_id]))

    candidates = defaultdict(list)
    for japanese_id, korean_options in translations.items():
        sentence = Japanese[japanese_id].strip()
        if not 8 <= len(sentence) <= 70 or UNSUITABLE_RE.search(sentence):
            continue
        spans = token_spans(sentence, tokenizer)
        for item in items:
            match = find_surface(item["word"], sentence, spans)
            if match is None:
                continue
            start, end, surface, exact = match
            blanked = sentence[:start] + "___" + sentence[end:]
            if blanked.count("___") != 1 or not KANJI_RE.search(blanked.replace("___", "")):
                continue
            for korean_id, translation in korean_options:
                translation = translation.strip()
                if not 4 <= len(translation) <= 100:
                    continue
                candidates[item["id"]].append({
                    "word": item["word"],
                    "japaneseId": japanese_id,
                    "koreanId": korean_id,
                    "sentenceOriginal": sentence,
                    "surface": surface,
                    "sentence": blanked,
                    "translation": translation,
                    "exact": exact,
                    "score": candidate_score(item["word"], sentence, exact),
                })
    for options in candidates.values():
        options.sort(key=lambda option: (-option["score"], option["japaneseId"], option["koreanId"]))
    return candidates


def choose_unique_candidates(
    items,
    candidates,
    limit,
    used_sentence_ids=None,
    used_blanked_sentences=None,
):
    chosen = {}
    used_sentences = set(used_sentence_ids or [])
    used_blanks = set(used_blanked_sentences or [])
    ordered = sorted(
        (item for item in items if candidates.get(item["id"])),
        key=lambda item: (len(candidates[item["id"]]), item["id"]),
    )
    for item in ordered:
        option = next(
            (
                candidate for candidate in candidates[item["id"]]
                if candidate["japaneseId"] not in used_sentences
                and candidate["sentence"] not in used_blanks
            ),
            None,
        )
        if option is None:
            continue
        chosen[item["id"]] = option
        used_sentences.add(option["japaneseId"])
        used_blanks.add(option["sentence"])
        if len(chosen) >= limit:
            break
    return chosen


def apply_candidates(items, chosen, tokenizer):
    for item in items:
        candidate = chosen.get(item["id"])
        if candidate is None:
            continue
        item.update({
            "sentence": candidate["sentence"],
            "sentenceSurface": candidate["surface"],
            "sentenceFurigana": add_furigana(candidate["sentence"], tokenizer),
            "sentenceTranslation": candidate["translation"],
            "sentenceSource": "Tatoeba 예문",
            "sentenceLicense": "CC BY 2.0 FR",
            "sentenceAttribution": f"https://tatoeba.org/ko/sentences/show/{candidate['japaneseId']}",
            "sentenceTranslationAttribution": f"https://tatoeba.org/ko/sentences/show/{candidate['koreanId']}",
        })


def apply_english_reference_fallbacks(items, tokenizer, limit):
    if limit <= 0:
        return 0
    by_id = {item["id"]: item for item in items}
    applied = 0
    for fallback in ENGLISH_REFERENCE_FALLBACKS:
        if applied >= limit:
            break
        item = by_id.get(fallback["itemId"])
        if item is None or item.get("sentence"):
            continue
        if item["word"] != fallback["word"]:
            raise ValueError(f"영어 참고 예문 단어가 일치하지 않습니다: {fallback['itemId']}")
        original = fallback["sentenceOriginal"]
        surface = fallback["surface"]
        if original.count(surface) != 1:
            raise ValueError(f"영어 참고 예문의 표면형이 하나가 아닙니다: {item['word']}")
        sentence = original.replace(surface, "___", 1)
        item.update({
            "sentence": sentence,
            "sentenceSurface": surface,
            "sentenceFurigana": add_furigana(sentence, tokenizer),
            "sentenceTranslation": fallback["translation"],
            "sentenceSource": "Tatoeba 예문 · 학습용 번역",
            "sentenceLicense": "CC BY 2.0 FR",
            "sentenceAttribution": f"https://tatoeba.org/ko/sentences/show/{fallback['japaneseId']}",
            "sentenceEnglishReference": f"https://tatoeba.org/ko/sentences/show/{fallback['englishId']}",
        })
        applied += 1
    return applied


def apply_quality_overrides(items, tokenizer):
    by_id = {item["id"]: item for item in items}
    for item_id, override in QUALITY_OVERRIDES.items():
        item = by_id.get(item_id)
        if item is None or item["word"] != override["word"]:
            raise ValueError(f"품질 교정 예문 단어가 일치하지 않습니다: {item_id}")

        if override.get("sentenceOriginal"):
            original = override["sentenceOriginal"]
            surface = override["surface"]
            if original.count(surface) != 1:
                raise ValueError(f"품질 교정 예문의 표면형이 하나가 아닙니다: {item['word']}")
            sentence = original.replace(surface, "___", 1)
            item.update({
                "sentence": sentence,
                "sentenceSurface": surface,
                "sentenceFurigana": add_furigana(sentence, tokenizer),
                "sentenceTranslation": override["translation"],
                "sentenceSource": "Tatoeba 예문 · 학습용 번역",
                "sentenceLicense": "CC BY 2.0 FR",
                "sentenceAttribution": f"https://tatoeba.org/ko/sentences/show/{override['japaneseId']}",
                "sentenceEnglishReference": f"https://tatoeba.org/ko/sentences/show/{override['englishId']}",
            })
        else:
            item["sentenceTranslation"] = override["translation"]
            item["sentenceSource"] = "Tatoeba 예문 · 학습용 번역"

        item.pop("sentenceTranslationAttribution", None)


def validate(items):
    sentence_items = [item for item in items if item.get("sentence")]
    invalid = [
        item["word"] for item in sentence_items
        if item["sentence"].count("___") != 1
        or item["sentenceFurigana"].count("___") != 1
        or not item["sentenceTranslation"]
    ]
    if invalid:
        raise ValueError(f"빈칸·후리가나·해석이 잘못된 항목: {', '.join(invalid[:10])}")
    return sentence_items


def main():
    required = [DATA_PATH, JPN_SENTENCES, KOR_SENTENCES, JPN_KOR_LINKS]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError(f"필요한 파일이 없습니다: {', '.join(missing)}")

    items = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    original_count = sum(bool(item.get("sentence")) for item in items)
    needed = max(0, TARGET_TOTAL - original_count)
    available_items = [item for item in items if not item.get("sentence")]
    used_sentence_ids = {
        int(item["sentenceAttribution"].rstrip("/").rsplit("/", 1)[-1])
        for item in items
        if item.get("sentenceAttribution", "").startswith("https://tatoeba.org/")
    }
    used_blanked_sentences = {item["sentence"] for item in items if item.get("sentence")}
    japanese = read_sentence_file(JPN_SENTENCES)
    korean = read_sentence_file(KOR_SENTENCES)
    links = read_links(JPN_KOR_LINKS)
    tokenizer = Tokenizer()
    candidates = make_candidates(available_items, japanese, korean, links, tokenizer)
    chosen = choose_unique_candidates(
        available_items,
        candidates,
        needed,
        used_sentence_ids,
        used_blanked_sentences,
    )
    apply_candidates(items, chosen, tokenizer)
    remaining = max(0, TARGET_TOTAL - sum(bool(item.get("sentence")) for item in items))
    fallback_count = apply_english_reference_fallbacks(items, tokenizer, remaining)
    apply_quality_overrides(items, tokenizer)
    sentence_items = validate(items)

    audit = {
        "targetTotal": TARGET_TOTAL,
        "originalCount": original_count,
        "matchedCount": len(chosen),
        "englishReferenceCount": fallback_count,
        "resultCount": len(sentence_items),
        "candidateWordCount": len(candidates),
        "unfilledCount": max(0, TARGET_TOTAL - len(sentence_items)),
        "chosen": list(chosen.values()),
    }
    AUDIT_PATH.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    DATA_PATH.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    compact = json.dumps(items, ensure_ascii=False, separators=(",", ":"))
    OUTPUT_JS.write_text(f"globalThis.N3_VOCAB_DATA = {compact};\n", encoding="utf-8")
    print(
        f"N3 sentences: {original_count} existing + {len(chosen)} direct Korean + "
        f"{fallback_count} reviewed translations = {len(sentence_items)} "
        f"(target {TARGET_TOTAL}, short {audit['unfilledCount']})"
    )
    print(f"candidate words: {len(candidates)}; audit: {AUDIT_PATH}")


if __name__ == "__main__":
    main()
