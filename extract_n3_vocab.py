import html
import json
import re
from pathlib import Path

import pdfplumber

from source_paths import N3_PDF_DIR


PDF_DIR = N3_PDF_DIR
MAIN_PDF = PDF_DIR / "JLPT_N3_한권합격_빈출단어문형암기장_스마트폰_패드_학습용.pdf"
LATEST_PDF = PDF_DIR / "N3_최신_기출_어휘_문형.pdf"
OUTPUT_JSON = Path("n3_vocab_curated.json")
OUTPUT_JS = Path("japanese-vocab-quiz/n3-vocab-data.js")

KANJI_RE = re.compile(r"[一-龯々〆ヵヶ]")
KANA_RE = re.compile(r"[ぁ-ゖァ-ヺー]")
JAPANESE_RE = re.compile(r"[一-龯々〆ヵヶぁ-ゖァ-ヺー]")
HANGUL_RE = re.compile(r"[가-힣]")
POS_LABELS = {"명", "동", "부", "형", "い", "な", "い형", "な형"}
POS_NORMALIZATION = {"い": "い형", "な": "な형"}


MOCK_SENTENCES = [
    {
        "word": "活気", "reading": "かっき", "meaning": "활기", "surface": "活気",
        "sentence": "うちの会社は若い社員が多くて、活気がある。",
        "translation": "우리 회사는 젊은 사원이 많아서 활기가 있다.",
    },
    {
        "word": "生える", "reading": "はえる", "meaning": "나다, 돋다", "surface": "生えて",
        "sentence": "畑に生えている草を抜かなければならない。",
        "translation": "밭에 나 있는 풀을 뽑지 않으면 안 된다.",
    },
    {
        "word": "利益", "reading": "りえき", "meaning": "이익", "surface": "利益",
        "sentence": "こんなに安く売ったら、利益が出ないでしょう。",
        "translation": "이렇게 싸게 팔면 이익이 나지 않겠지요.",
    },
    {
        "word": "腰", "reading": "こし", "meaning": "허리", "surface": "腰",
        "sentence": "重い物を持ったので、腰が痛くなってしまった。",
        "translation": "무거운 것을 들었기 때문에 허리가 아파져 버렸다.",
    },
    {
        "word": "裏", "reading": "うら", "meaning": "뒤, 뒷면", "surface": "裏",
        "sentence": "わたしの家の裏には小さな山があります。",
        "translation": "제 집 뒤에는 작은 산이 있습니다.",
    },
    {
        "word": "予報", "reading": "よほう", "meaning": "예보", "surface": "予報",
        "sentence": "天気予報で明日は雪だと言っていました。",
        "translation": "일기예보에서 내일은 눈이라고 말했습니다.",
    },
    {
        "word": "簡潔だ", "reading": "かんけつだ", "meaning": "간결하다", "surface": "簡潔に",
        "sentence": "わかりにくいので、簡潔に説明してください。",
        "translation": "알기 어려우니까 간결하게 설명해 주세요.",
    },
    {
        "word": "汚す", "reading": "よごす", "meaning": "더럽히다", "surface": "汚して",
        "sentence": "姉から借りたマフラーを汚してしまった。",
        "translation": "언니에게 빌린 머플러를 더럽히고 말았다.",
    },
    {
        "word": "伝言", "reading": "でんごん", "meaning": "전언", "surface": "伝言",
        "sentence": "高梨部長からの伝言をお預かりしています。",
        "translation": "다카나시 부장님으로부터 전언을 맡아두었습니다.",
    },
    {
        "word": "重ねる", "reading": "かさねる", "meaning": "거듭하다", "surface": "重ねた",
        "sentence": "努力を重ねたから、優勝することができた。",
        "translation": "노력을 거듭했기 때문에 우승할 수 있었다.",
    },
    {
        "word": "運賃", "reading": "うんちん", "meaning": "운임", "surface": "運賃",
        "sentence": "品川駅までの運賃はいくらですか。",
        "translation": "시나가와역까지의 운임은 얼마입니까?",
    },
    {
        "word": "命令", "reading": "めいれい", "meaning": "명령", "surface": "命令",
        "sentence": "それは誰に命令されたのですか。",
        "translation": "그것은 누구에게 명령받았습니까?",
    },
    {
        "word": "法律", "reading": "ほうりつ", "meaning": "법률", "surface": "法律",
        "sentence": "大学で法律について学んでみたい。",
        "translation": "대학에서 법률에 대해 배워 보고 싶다.",
    },
    {
        "word": "焼く", "reading": "やく", "meaning": "굽다", "surface": "焼く",
        "sentence": "ステーキをおいしく焼くポイントを聞いた。",
        "translation": "스테이크를 맛있게 굽는 요령을 물었다.",
    },
    {
        "word": "伸びる", "reading": "のびる", "meaning": "늘다, 자라다", "surface": "伸びた",
        "sentence": "うちの子はこの一年で背が10センチも伸びた。",
        "translation": "우리 아이는 이 1년 동안 키가 10cm나 자랐다.",
    },
    {
        "word": "エンジン", "reading": "えんじん", "meaning": "엔진", "surface": "エンジン",
        "sentence": "今朝、車のエンジンをかけたら、変な音がした。",
        "translation": "오늘 아침 차에 시동을 걸었더니 이상한 소리가 났다.",
    },
    {
        "word": "仲", "reading": "なか", "meaning": "사이, 관계", "surface": "仲",
        "sentence": "昔からの知り合いでいくら深い仲でも、礼儀は守るべきだ。",
        "translation": "옛날부터 지인이어서 아무리 깊은 사이라도 예의는 지켜야 한다.",
    },
    {
        "word": "ぎりぎり", "reading": "ぎりぎり", "meaning": "아슬아슬하게", "surface": "ぎりぎり",
        "sentence": "遅刻しそうだったが、駅から走って行ったので、ぎりぎり授業に間に合った。",
        "translation": "지각할 것 같았지만 역에서부터 달려갔기 때문에 아슬아슬하게 수업 시간에 맞췄다.",
    },
    {
        "word": "渋滞", "reading": "じゅうたい", "meaning": "정체", "surface": "渋滞",
        "sentence": "この道はあちらのデパートに行く車でいつも渋滞している。",
        "translation": "이 길은 저쪽 백화점에 가는 차로 언제나 정체하고 있다.",
    },
    {
        "word": "うっかり", "reading": "うっかり", "meaning": "깜빡, 무심코", "surface": "うっかり",
        "sentence": "昨日までに書類を出さなければいけなかったのに、うっかりしていた。",
        "translation": "어제까지 서류를 내야 했는데 깜빡하고 있었다.",
    },
    {
        "word": "悔しい", "reading": "くやしい", "meaning": "분하다, 억울하다", "surface": "悔しくて",
        "sentence": "友達にテストの成績をばかにされたのが悔しくて、一生懸命勉強した。",
        "translation": "친구에게 시험 성적을 놀림당한 것이 분해서 열심히 공부했다.",
    },
    {
        "word": "付き合う", "reading": "つきあう", "meaning": "사귀다, 교제하다", "surface": "付き合って",
        "sentence": "同僚の紹介で出会った彼女とは、付き合ってもうすぐ三年が経ちます。",
        "translation": "동료 소개로 만난 여자친구와는 사귄 지 이제 곧 3년이 지납니다.",
    },
    {
        "word": "レシピ", "reading": "れしぴ", "meaning": "조리법, 레시피", "surface": "レシピ",
        "sentence": "食欲がない時でも食べられる、豚肉を使ったレシピです。",
        "translation": "식욕이 없을 때에도 먹을 수 있는 돼지고기를 사용한 레시피입니다.",
    },
    {
        "word": "穏やかだ", "reading": "おだやかだ", "meaning": "온화하다, 평온하다", "surface": "穏やかな",
        "sentence": "今日は空も晴れて、風もあまり強くないので、穏やかな一日になりそうです。",
        "translation": "오늘은 하늘도 개고 바람도 세지 않아서 평온한 하루가 될 것 같습니다.",
    },
    {
        "word": "延期", "reading": "えんき", "meaning": "연기", "surface": "延期",
        "sentence": "ずっと楽しみにしていた映画の公開日が延期になって、とても悲しかった。",
        "translation": "계속 기대하던 영화 공개일이 연기되어 매우 슬펐다.",
    },
    {
        "word": "じっと", "reading": "じっと", "meaning": "꼼짝 않고, 가만히", "surface": "じっと",
        "sentence": "彼はそこで彼女の帰りをじっと待っていたそうだ。",
        "translation": "그는 그곳에서 그녀가 돌아오기를 꼼짝 않고 기다렸다고 한다.",
    },
    {
        "word": "ベストだ", "reading": "べすとだ", "meaning": "최선이다", "surface": "ベストな",
        "sentence": "それはベストな選択だったと思います。",
        "translation": "그것은 최선의 선택이었다고 생각합니다.",
    },
    {
        "word": "避難", "reading": "ひなん", "meaning": "피난", "surface": "避難",
        "sentence": "危険だから、すぐに避難してください。",
        "translation": "위험하니까 바로 피난해 주세요.",
    },
    {
        "word": "暮らし", "reading": "くらし", "meaning": "생활, 살림", "surface": "暮らし",
        "sentence": "田舎の暮らしは思ったより不便だった。",
        "translation": "시골 생활은 생각보다 불편했다.",
    },
    {
        "word": "案外", "reading": "あんがい", "meaning": "의외로, 예상외로", "surface": "案外",
        "sentence": "人間関係で悩んでいる人は案外多い。",
        "translation": "인간관계로 고민하는 사람은 예상외로 많다.",
    },
    {
        "word": "すっきり", "reading": "すっきり", "meaning": "개운하게, 산뜻하게", "surface": "すっきり",
        "sentence": "朝から頭が痛かったが、昼休みに少し寝たらすっきりした。",
        "translation": "아침부터 머리가 아팠지만 점심시간에 조금 잤더니 개운해졌다.",
    },
    {
        "word": "景気", "reading": "けいき", "meaning": "경기", "surface": "景気",
        "sentence": "物がよく売れているので景気は悪くないと思います。",
        "translation": "물건이 잘 팔리기 때문에 경기는 나쁘지 않다고 생각합니다.",
    },
    {
        "word": "意識", "reading": "いしき", "meaning": "의식", "surface": "意識",
        "sentence": "先輩の話を聞いて、仕事に対する意識が変わった。",
        "translation": "선배 이야기를 듣고 일에 대한 의식이 바뀌었다.",
    },
    {
        "word": "欠点", "reading": "けってん", "meaning": "결점", "surface": "欠点",
        "sentence": "欠点を直そうと頑張っているが、なかなか直らない。",
        "translation": "결점을 고치려고 노력하지만 좀처럼 고쳐지지 않는다.",
    },
    {
        "word": "知り合う", "reading": "しりあう", "meaning": "알게 되다", "surface": "知り合って",
        "sentence": "三年前に友達の紹介で彼と知り合って、今も仲良くしている。",
        "translation": "3년 전에 친구 소개로 그와 알게 되어 지금도 사이좋게 지내고 있다.",
    },
]


def close(value, target, tolerance=0.35):
    return abs(float(value) - float(target)) <= tolerance


def katakana_to_hiragana(text):
    return "".join(
        chr(ord(character) - 0x60) if "ァ" <= character <= "ヶ" else character
        for character in text
    )


def clean_text(text):
    text = re.sub(r"\s+", " ", text.strip())
    text = re.sub(r"\s+([,.)])", r"\1", text)
    text = re.sub(r"([(])\s+", r"\1", text)
    return text


def printed_reading(page, words, base_top, word_left, word_right, base_size):
    ruby_words = [
        word for word in words
        if close(word["size"], 5.0, 0.15)
        and base_top - 10.0 <= word["top"] <= base_top - 4.0
        and word["x1"] >= word_left - 1.0
        and word["x0"] <= word_right + 1.0
        and KANA_RE.search(word["text"])
    ]
    base_kana = [
        character for character in page.chars
        if close(character.get("size", 0), base_size, 0.15)
        and close(character.get("top", -100), base_top, 0.35)
        and character["x0"] >= word_left - 0.5
        and character["x1"] <= word_right + 0.5
        and KANA_RE.search(character.get("text", ""))
    ]
    pieces = [(word["x0"], 0, word["text"]) for word in ruby_words]
    pieces.extend((character["x0"], 1, character["text"]) for character in base_kana)
    reading = "".join(piece[2] for piece in sorted(pieces, key=lambda item: (item[0], item[1])))
    return katakana_to_hiragana(reading)


def extract_main_entries():
    entries = []
    with pdfplumber.open(MAIN_PDF) as pdf:
        for page_number in range(3, 43):
            page = pdf.pages[page_number - 1]
            words = page.extract_words(
                x_tolerance=1,
                y_tolerance=1,
                keep_blank_chars=False,
                extra_attrs=["size"],
            )
            for pos in words:
                if not close(pos["size"], 6.0, 0.15) or pos["text"] not in POS_LABELS:
                    continue
                is_left = pos["x0"] < page.width / 2
                column_left = 60 if is_left else page.width / 2 + 5
                column_right = page.width / 2 - 5 if is_left else page.width - 25
                base_top = pos["top"] + 2.56
                base_words = [
                    word for word in words
                    if close(word["size"], 9.5, 0.15)
                    and close(word["top"], base_top, 0.35)
                    and word["x0"] >= column_left
                    and word["x1"] <= pos["x0"] - 1.0
                ]
                meaning_words = [
                    word for word in words
                    if close(word["size"], 7.5, 0.15)
                    and close(word["top"], pos["top"] - 0.60, 0.35)
                    and word["x0"] >= pos["x1"] + 2.0
                    and word["x1"] <= column_right
                ]
                word_text = "".join(word["text"] for word in sorted(base_words, key=lambda item: item["x0"]))
                meaning = clean_text(" ".join(word["text"] for word in sorted(meaning_words, key=lambda item: item["x0"])))
                if not word_text or not meaning or not KANJI_RE.search(word_text) or not HANGUL_RE.search(meaning):
                    continue
                word_left = min(word["x0"] for word in base_words)
                word_right = max(word["x1"] for word in base_words)
                reading = printed_reading(page, words, base_top, word_left, word_right, 9.5)
                entries.append({
                    "word": word_text,
                    "reading": reading,
                    "meaning": meaning,
                    "partOfSpeech": POS_NORMALIZATION.get(pos["text"], pos["text"]),
                    "source": "빈출 단어 암기장",
                    "sourcePage": page_number,
                    "sortKey": (page_number, 0 if is_left else 1, base_top),
                })
    return sorted(entries, key=lambda item: item["sortKey"])


def extract_latest_entries():
    entries = []
    columns = [
        (35, 122, 122, 235),
        (235, 302, 302, 412),
        (412, 480, 480, 594),
    ]
    with pdfplumber.open(LATEST_PDF) as pdf:
        for page_number in range(1, len(pdf.pages) + 1, 2):
            page = pdf.pages[page_number - 1]
            if "기출 어휘" not in (page.extract_text() or ""):
                continue
            words = page.extract_words(
                x_tolerance=1,
                y_tolerance=1,
                keep_blank_chars=False,
                extra_attrs=["size"],
            )
            for column_index, (word_left, word_right, meaning_left, meaning_right) in enumerate(columns):
                row_tops = sorted({
                    round(word["top"], 2) for word in words
                    if close(word["size"], 8.5, 0.15)
                    and word["x0"] >= word_left
                    and word["x1"] <= word_right
                    and JAPANESE_RE.search(word["text"])
                })
                for base_top in row_tops:
                    base_words = [
                        word for word in words
                        if close(word["size"], 8.5, 0.15)
                        and close(word["top"], base_top, 0.35)
                        and word["x0"] >= word_left
                        and word["x1"] <= word_right
                    ]
                    meaning_words = [
                        word for word in words
                        if close(word["size"], 8.0, 0.15)
                        and close(word["top"], base_top - 4.77, 0.65)
                        and word["x0"] >= meaning_left
                        and word["x1"] <= meaning_right
                    ]
                    word_text = "".join(word["text"] for word in sorted(base_words, key=lambda item: item["x0"]))
                    meaning = clean_text(" ".join(word["text"] for word in sorted(meaning_words, key=lambda item: item["x0"])))
                    if not word_text or not meaning or not KANJI_RE.search(word_text) or not HANGUL_RE.search(meaning):
                        continue
                    actual_left = min(word["x0"] for word in base_words)
                    actual_right = max(word["x1"] for word in base_words)
                    reading = printed_reading(page, words, base_top, actual_left, actual_right, 8.5)
                    entries.append({
                        "word": word_text,
                        "reading": reading,
                        "meaning": meaning,
                        "source": "최신 기출 어휘",
                        "sourcePage": page_number,
                        "sortKey": (page_number, column_index, base_top),
                    })
    return sorted(entries, key=lambda item: item["sortKey"])


def add_sentence_fields(entry, sentence_item):
    original = sentence_item["sentence"]
    surface = sentence_item["surface"]
    if original.count(surface) != 1:
        raise ValueError(f"{sentence_item['word']} 예문에서 빈칸 표면형을 하나 찾지 못했습니다: {surface}")
    blanked = original.replace(surface, "___", 1)
    entry.update({
        "reading": sentence_item["reading"],
        "sentence": blanked,
        "sentenceFurigana": add_furigana(blanked),
        "sentenceTranslation": sentence_item["translation"],
        "sentenceSource": "온라인 실전모의고사",
    })


def add_furigana(sentence):
    # The PDF list supplies the quiz readings. Janome is only used here to add
    # reading aids to the remaining kanji in the example sentence.
    import sys

    janome_path = Path("tmp/janome")
    if janome_path.exists() and str(janome_path.resolve()) not in sys.path:
        sys.path.insert(0, str(janome_path.resolve()))
    from janome.tokenizer import Tokenizer

    tokenizer = getattr(add_furigana, "_tokenizer", None)
    if tokenizer is None:
        tokenizer = Tokenizer()
        add_furigana._tokenizer = tokenizer
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


def build_dataset():
    merged = {}
    for candidate in extract_main_entries() + extract_latest_entries():
        candidate.pop("sortKey", None)
        existing = merged.get(candidate["word"])
        if existing is None:
            merged[candidate["word"]] = candidate
            continue
        meanings = [part.strip() for part in existing["meaning"].split(" / ")]
        if candidate["meaning"] not in meanings:
            existing["meaning"] += f" / {candidate['meaning']}"

    for sentence_item in MOCK_SENTENCES:
        entry = merged.get(sentence_item["word"])
        if entry is None:
            entry = {
                "word": sentence_item["word"],
                "reading": sentence_item["reading"],
                "meaning": sentence_item["meaning"],
                "source": "온라인 실전모의고사",
            }
            merged[entry["word"]] = entry
        add_sentence_fields(entry, sentence_item)

    result = []
    for index, entry in enumerate(merged.values(), start=1):
        item = {
            "id": f"n3-{index:04d}",
            "level": "N3",
            **entry,
        }
        result.append(item)
    return result


def validate(items):
    sentence_items = [item for item in items if item.get("sentence")]
    kanji_items = [item for item in items if KANJI_RE.search(item["word"])]
    if len(items) < 500 or len(kanji_items) < 500:
        raise ValueError(f"N3 추출 결과가 너무 적습니다: 전체 {len(items)}, 한자 {len(kanji_items)}")
    if len(sentence_items) != len(MOCK_SENTENCES):
        raise ValueError(f"N3 예문은 {len(MOCK_SENTENCES)}개여야 합니다: {len(sentence_items)}")
    if len({item["id"] for item in items}) != len(items):
        raise ValueError("N3 ID가 중복되었습니다.")
    if len({item["word"] for item in items}) != len(items):
        raise ValueError("N3 단어가 중복되었습니다.")
    invalid = [
        item for item in items
        if not item["word"] or not item["reading"] or not item["meaning"] or not item["source"]
    ]
    if invalid:
        preview = ", ".join(item["word"] for item in invalid[:10])
        raise ValueError(f"읽기 또는 뜻이 비어 있는 N3 항목이 있습니다: {preview}")
    readings_with_kanji = [item for item in items if KANJI_RE.search(item["reading"])]
    if readings_with_kanji:
        preview = ", ".join(item["word"] for item in readings_with_kanji[:10])
        raise ValueError(f"PDF 읽기 추출에 실패한 항목이 있습니다: {preview}")
    for item in sentence_items:
        if item["sentence"].count("___") != 1 or item["sentenceFurigana"].count("___") != 1:
            raise ValueError(f"{item['word']} 예문의 빈칸이 올바르지 않습니다.")
        if not item["sentenceTranslation"] or not item["sentenceFurigana"]:
            raise ValueError(f"{item['word']} 예문의 후리가나 또는 해석이 없습니다.")
    return len(kanji_items), len(sentence_items)


def main():
    items = build_dataset()
    kanji_count, sentence_count = validate(items)
    OUTPUT_JSON.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    compact = json.dumps(items, ensure_ascii=False, separators=(",", ":"))
    OUTPUT_JS.write_text(f"globalThis.N3_VOCAB_DATA = {compact};\n", encoding="utf-8")
    print(f"generated {len(items)} N3 records ({kanji_count} kanji, {sentence_count} sentences)")
    print(f"wrote {OUTPUT_JSON} and {OUTPUT_JS}")


if __name__ == "__main__":
    main()
