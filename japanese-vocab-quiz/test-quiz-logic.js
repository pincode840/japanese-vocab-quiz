"use strict";

const assert = require("node:assert/strict");
require("./vocab-data.js");
require("./n3-vocab-data.js");
require("./n2-vocab-data.js");
require("./katakana-vocab-data.js");
const engine = require("./quiz-engine.js");

const data = globalThis.VOCAB_DATA;
const n3Data = globalThis.N3_VOCAB_DATA;
const n2Data = globalThis.N2_VOCAB_DATA;
const katakanaData = globalThis.KATAKANA_VOCAB_DATA;
assert.equal(data.length, 480, "480개 단어가 있어야 합니다.");
assert.equal(new Set(data.map((item) => item.id)).size, 480, "단어 ID는 중복되면 안 됩니다.");
assert.equal(
  data.filter((item) => item.day >= 25 && item.day <= 30).length,
  120,
  "25~30일차 새 단어는 120개여야 합니다.",
);
assert.deepEqual(
  data.filter((item) => item.day >= 25 && item.day <= 30)
    .reduce((counts, item) => ({ ...counts, [item.day]: (counts[item.day] || 0) + 1 }), {}),
  { 25: 20, 26: 20, 27: 20, 28: 20, 29: 20, 30: 20 },
  "25~30일차는 일차별로 20개씩 있어야 합니다.",
);
assert.equal(data.find((item) => item.id === "d25-10")?.meaning, "모래");
assert.equal(data.find((item) => item.id === "d28-4")?.meaning, "수염");
assert.equal(data.find((item) => item.id === "d29-18")?.meaning, "역사");
assert.equal(data.find((item) => item.id === "d9-3")?.reading, "まいとし／まいねん");
[
  ["d8-15", "sentence", "この___にはレストランがない。"],
  ["d8-18", "sentence", "このコーヒーは___のコーヒーより高いです。"],
  ["d9-17", "sentence", "彼女の___は美しいです。"],
  ["d9-18", "sentence", "___屋で眼鏡を買いました。"],
  ["d10-7", "sentence", "___が１０センチ積もりました。"],
  ["d13-13", "sentenceTranslation", "외국어는 반복 학습이 중요하다."],
  ["d15-12", "sentence", "___たことがあったら相談してください。"],
  ["d16-18", "sentence", "長く___でいる。"],
  ["d17-16", "sentenceFurigana", "<ruby>家族写真<rt>かぞくしゃしん</rt></ruby>を___ています。"],
  ["d17-18", "sentence", "姉は小説を___でいます。"],
  ["d18-20", "sentence", "___暑くなっています。"],
  ["d19-2", "sentence", "___の人に伝えてください。"],
  ["d19-14", "sentence", "___行って右折してください。"],
  ["d20-18", "sentence", "書類は___に提出してください。"],
  ["d21-1", "sentence", "田中さんは___の練習をしています。"],
  ["d23-5", "sentenceFurigana", "<ruby>新年<rt>しんねん</rt></ruby>になると<ruby>一年<rt>いちねん</rt></ruby>の___を<ruby>立<rt>た</rt></ruby>てる。"],
  ["d24-8", "sentence", "この村は___被害が深刻です。"],
  ["d24-14", "sentence", "彼は中小企業の___です。"],
  ["d24-14", "reading", "しゃちょう"],
  ["d26-2", "reading", "たいふう"],
].forEach(([id, field, expected]) => {
  assert.equal(data.find((item) => item.id === id)?.[field], expected, `${id} ${field} 오타가 없어야 합니다.`);
});
assert.ok(
  data.every(
    (item) => !/[。！？][。！？]|[?.!]\.|\s+[。！？]/.test(
      `${item.sentence} ${item.sentenceFurigana} ${item.sentenceTranslation}`,
    ),
  ),
  "N5·N4 예문과 해석에 중복되거나 잘못 배치된 문장부호가 없어야 합니다.",
);
assert.ok(
  data.every(
    (item) => item.word
      && item.reading
      && item.meaning
      && item.sentence?.split("___").length === 2
      && item.sentenceFurigana?.split("___").length === 2
      && item.sentenceTranslation,
  ),
  "모든 N5·N4 단어에 읽기, 뜻, Word 예문, 후리가나와 해석이 있어야 합니다.",
);
assert.ok(
  data.filter((item) => item.sentenceFurigana.includes("<ruby>")).length >= 300,
  "N5·N4 예문의 한자에는 원본 Word 후리가나가 표시되어야 합니다.",
);
assert.equal(n2Data.length, 100, "N2 PDF 선별 단어는 100개여야 합니다.");
assert.equal(new Set(n2Data.map((item) => item.id)).size, 100, "N2 단어 ID는 중복되면 안 됩니다.");
assert.equal(new Set(n2Data.map((item) => item.word)).size, 100, "N2 한자 단어는 중복되면 안 됩니다.");
assert.ok(
  n2Data.every(
    (item) => item.level === "N2"
      && item.word
      && item.reading
      && item.meaning
      && item.source
      && item.sentence?.split("___").length === 2
      && item.sentenceFurigana?.split("___").length === 2
      && item.sentenceFurigana.includes("<ruby>")
      && item.sentenceTranslation,
  ),
  "모든 N2 단어에 읽기, 뜻, PDF 분류, 후리가나와 문장 해석이 있어야 합니다.",
);

assert.equal(katakanaData.length, 100, "카타카나 기초 단어는 100개여야 합니다.");
assert.equal(new Set(katakanaData.map((item) => item.id)).size, 100, "카타카나 단어 ID는 중복되면 안 됩니다.");
assert.equal(new Set(katakanaData.map((item) => item.word)).size, 100, "카타카나 단어는 중복되면 안 됩니다.");
assert.equal(new Set(katakanaData.map((item) => item.meaning)).size, 100, "카타카나 뜻 선택지는 중복되면 안 됩니다.");
assert.ok(
  katakanaData.every((item) => item.level === "카타카나"
    && /^[ァ-ヶー]+$/.test(item.word)
    && /^[ぁ-ゖー]+$/.test(item.reading)
    && item.word.replace(/[ァ-ヶ]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60)) === item.reading
    && item.meaning
    && item.source),
  "모든 카타카나 단어에 올바른 표기, 히라가나 읽기, 뜻과 출처가 있어야 합니다.",
);
for (const choiceCount of [4, 6, 8]) {
  const choices = engine.buildChoicesByMeaning(katakanaData, katakanaData[0], choiceCount, () => 0.42);
  assert.equal(choices.length, choiceCount, `카타카나 뜻 선택지는 ${choiceCount}개여야 합니다.`);
  assert.ok(choices.some((choice) => choice.id === katakanaData[0].id));
  assert.equal(new Set(choices.map((choice) => choice.meaning)).size, choiceCount);
}

assert.equal(n3Data.length, 1330, "N3 PDF 어휘와 실전 예문 항목은 1,330개여야 합니다.");
assert.equal(new Set(n3Data.map((item) => item.id)).size, 1330, "N3 단어 ID는 중복되면 안 됩니다.");
assert.equal(new Set(n3Data.map((item) => item.word)).size, 1330, "N3 단어는 중복되면 안 됩니다.");
assert.equal(
  n3Data.filter((item) => /[一-龯々〆ヵヶ]/.test(item.word)).length,
  1323,
  "N3 일반 모드용 한자 어휘는 1,323개여야 합니다.",
);
assert.ok(
  n3Data.every(
    (item) => item.level === "N3"
      && item.word
      && item.reading
      && item.meaning
      && item.source,
  ),
  "모든 N3 단어에 읽기, 뜻과 PDF 출처가 있어야 합니다.",
);
const n3SentenceData = n3Data.filter((item) => item.sentence);
assert.equal(n3SentenceData.length, 500, "N3 문장 빈칸 예문은 500개여야 합니다.");
assert.ok(
  n3SentenceData.every(
    (item) => item.sentence.split("___").length === 2
      && item.sentenceFurigana?.split("___").length === 2
      && item.sentenceFurigana.includes("<ruby>")
      && item.sentenceTranslation,
  ),
  "모든 N3 문장 문제에 빈칸, 후리가나와 해석이 있어야 합니다.",
);
assert.equal(
  n3SentenceData.filter((item) => item.sentenceSource === "온라인 실전모의고사").length,
  35,
  "N3 온라인 실전모의고사 예문 35개가 유지되어야 합니다.",
);
const n3TatoebaData = n3SentenceData.filter((item) => item.sentenceAttribution);
assert.equal(n3TatoebaData.length, 465, "Tatoeba 기반 N3 예문은 465개여야 합니다.");
assert.ok(
  n3TatoebaData.every(
    (item) => item.sentenceLicense === "CC BY 2.0 FR"
      && /^https:\/\/tatoeba\.org\/ko\/sentences\/show\/\d+$/.test(item.sentenceAttribution),
  ),
  "Tatoeba 기반 N3 예문에는 라이선스와 원문 링크가 있어야 합니다.",
);

const n3KanjiData = n3Data.filter((item) => /[一-龯々〆ヵヶ]/.test(item.word));
for (const quizData of [data, n3KanjiData, n2Data]) {
  for (const item of quizData) {
    const choices = engine.buildChoices(quizData, item, () => 0.42);
    assert.equal(choices.length, 4, `${item.word} 선택지는 4개여야 합니다.`);
    assert.ok(choices.some((choice) => choice.id === item.id), `${item.word} 정답이 선택지에 있어야 합니다.`);
    assert.equal(
      new Set(choices.map((choice) => engine.normalizedReading(choice.reading))).size,
      4,
      `${item.word} 선택지의 읽기가 중복되면 안 됩니다.`,
    );

    const wordChoices = engine.buildChoicesByWord(quizData, item, () => 0.42);
    assert.equal(wordChoices.length, 4, `${item.word} 역방향 선택지는 4개여야 합니다.`);
    assert.ok(wordChoices.some((choice) => choice.id === item.id), `${item.word} 역방향 정답이 선택지에 있어야 합니다.`);
    assert.equal(new Set(wordChoices.map((choice) => choice.word)).size, 4, "역방향 한자 선택지가 중복되면 안 됩니다.");
    assert.equal(
      wordChoices.filter(
        (choice) => engine.normalizedReading(choice.reading) === engine.normalizedReading(item.reading),
      ).length,
      1,
      `${item.reading} 읽기에는 정답 한 개만 있어야 합니다.`,
    );
  }
}

for (const quizData of [data, n3KanjiData, n2Data]) {
  for (const choiceCount of [4, 6, 8]) {
    const item = quizData[0];
    const readingChoices = engine.buildChoices(quizData, item, choiceCount, () => 0.42);
    const wordChoices = engine.buildChoicesByWord(quizData, item, choiceCount, () => 0.42);
    assert.equal(readingChoices.length, choiceCount, `읽기 선택지는 ${choiceCount}개여야 합니다.`);
    assert.equal(wordChoices.length, choiceCount, `한자 선택지는 ${choiceCount}개여야 합니다.`);
    assert.ok(readingChoices.some((choice) => choice.id === item.id));
    assert.ok(wordChoices.some((choice) => choice.id === item.id));
  }
}

const progress = { mistakeCounts: { [data[10].id]: 3 }, seenIds: data.slice(0, 100).map((item) => item.id) };
const selected = engine.selectSessionItems(data, progress, 20, () => 0.5);
assert.equal(selected.length, 20);
assert.ok(selected.some((item) => item.id === data[10].id), "자주 틀린 단어가 다음 회차에 우선 포함되어야 합니다.");

const queue = ["a", "b", "c", "d"];
const insertedAt = engine.insertRetry(queue, "wrong", 3);
assert.equal(insertedAt, 3);
assert.deepEqual(queue, ["a", "b", "c", "wrong", "d"], "오답은 세 문제 뒤에 다시 나와야 합니다.");
assert.equal(engine.accuracy(16, 20), 80);
assert.equal(engine.accuracy(0, 0), null);
assert.deepEqual(
  engine.kanaReadings("まいとし／まいねん"),
  ["まいとし", "まいねん"],
  "복수 읽기는 각각 올바른 히라가나 정답으로 분리해야 합니다.",
);
assert.deepEqual(engine.kanaReadings("もう いちど"), ["もういちど"]);

const migratedCounts = engine.migrateScopedCounts(
  {
    "d7-1": 3,
    "kanji-to-kana:d7-2": 2,
    "n5n4:reading-to-kanji:d7-3": 1,
  },
  [
    { scopedKey: "n5n4:kanji-to-reading:d7-1", legacyKeys: ["kanji-to-reading:d7-1", "d7-1"] },
    { scopedKey: "n5n4:kanji-to-kana:d7-2", legacyKeys: ["kanji-to-kana:d7-2"] },
    { scopedKey: "n5n4:reading-to-kanji:d7-3", legacyKeys: ["reading-to-kanji:d7-3"] },
  ],
);
assert.deepEqual(
  migratedCounts,
  {
    "n5n4:kanji-to-reading:d7-1": 3,
    "n5n4:kanji-to-kana:d7-2": 2,
    "n5n4:reading-to-kanji:d7-3": 1,
  },
  "구형 오답 기록을 난이도·학습 모드별 키로 이전해야 합니다.",
);

const cleanStreaks = {};
const practiceCooldowns = {};
const reviewKey = "n5n4:kanji-to-reading:d7-1";
assert.deepEqual(
  engine.updateCleanReview(cleanStreaks, practiceCooldowns, [reviewKey], [], 1),
  [],
);
assert.equal(cleanStreaks[reviewKey], 1);
engine.updateCleanReview(cleanStreaks, practiceCooldowns, [reviewKey], [], 2);
assert.equal(cleanStreaks[reviewKey], 2);
assert.deepEqual(
  engine.updateCleanReview(cleanStreaks, practiceCooldowns, [reviewKey], [], 3),
  [reviewKey],
  "3회 연속 무오답이면 복습 대기 상태가 되어야 합니다.",
);
assert.equal(cleanStreaks[reviewKey], 0);
assert.equal(practiceCooldowns[reviewKey], 7);
for (const practiceRound of [4, 5, 6]) {
  assert.equal(
    engine.isReviewEligible(practiceCooldowns, reviewKey, practiceRound),
    false,
    `${practiceRound}회차에는 복습 대기 단어가 나오면 안 됩니다.`,
  );
}
assert.equal(
  engine.isReviewEligible(practiceCooldowns, reviewKey, 7),
  true,
  "3회차가 지난 뒤에는 단어가 다시 나와야 합니다.",
);
cleanStreaks[reviewKey] = 2;
engine.updateCleanReview(cleanStreaks, practiceCooldowns, [reviewKey], [reviewKey], 8);
assert.equal(cleanStreaks[reviewKey], 0, "한 번이라도 틀리면 무오답 연속 횟수가 초기화되어야 합니다.");

console.log("quiz logic tests passed");
