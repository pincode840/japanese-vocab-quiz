"use strict";

const assert = require("node:assert/strict");
require("./vocab-data.js");
require("./n3-vocab-data.js");
require("./n2-vocab-data.js");
require("./katakana-vocab-data.js");
globalThis.QuizEngine = require("./quiz-engine.js");

class ClassList {
  constructor(owner) {
    this.owner = owner;
    this.values = new Set();
  }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const next = force === undefined ? !this.contains(name) : Boolean(force);
    if (next) this.add(name); else this.remove(name);
    return next;
  }
  replaceFrom(text) {
    this.values = new Set(String(text).split(/\s+/).filter(Boolean));
  }
  toString() { return [...this.values].join(" "); }
}

class MiniElement {
  constructor(tagName = "div", id = "") {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.textContent = "";
    this.innerHTML = "";
    this.listeners = {};
    this.classList = new ClassList(this);
  }
  set className(value) { this.classList.replaceFrom(value); }
  get className() { return this.classList.toString(); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatch(type) { for (const handler of this.listeners[type] || []) handler({ target: this }); }
  setAttribute(name, value) { this[name] = String(value); }
  focus() {}
  click() {
    if (this.disabled) return;
    for (const handler of this.listeners.click || []) handler({ target: this });
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      if (selector === "button" && node.tagName === "BUTTON") matches.push(node);
      node.children.forEach(visit);
    };
    this.children.forEach(visit);
    return matches;
  }
}

const ids = [
  "start-screen", "quiz-screen", "result-screen", "home-button", "start-selection-label", "next-session-number",
  "mode-records-title", "record-kanji-reading", "kanji-reading-sessions", "kanji-reading-last-accuracy", "kanji-reading-total-accuracy",
  "record-kanji-kana", "kanji-kana-sessions", "kanji-kana-last-accuracy", "kanji-kana-total-accuracy",
  "record-reading-kanji", "reading-kanji-sessions", "reading-kanji-last-accuracy", "reading-kanji-total-accuracy",
  "record-sentence-kanji", "sentence-kanji-sessions", "sentence-kanji-last-accuracy", "sentence-kanji-total-accuracy",
  "record-katakana-meaning", "katakana-meaning-sessions", "katakana-meaning-last-accuracy", "katakana-meaning-total-accuracy",
  "history-panel", "history-list", "start-button",
  "difficulty-picker", "katakana-mode-note",
  "difficulty-basic", "difficulty-n3", "difficulty-n2", "mode-kanji-reading", "mode-kanji-kana", "mode-reading-kanji",
  "mode-sentence-kanji", "mode-katakana-meaning", "exam-mode", "exam-mode-state", "exam-mode-note", "choice-count-4", "choice-count-6", "choice-count-8", "choice-count-picker",
  "general-question-count-panel", "general-question-count",
  "general-question-count-hint", "question-count-panel", "sentence-question-count",
  "sentence-question-count-hint",
  "quiz-session-label", "quiz-progress-text",
  "live-accuracy", "exam-timer", "exam-time-left", "progress-bar", "quiz-prompt", "quiz-word",
  "day-label", "exam-mistake-badge", "answer-grid", "kana-composer", "kana-answer", "kana-grid", "kana-backspace", "kana-clear", "kana-submit",
  "feedback", "feedback-icon", "feedback-title", "feedback-selected", "feedback-reading",
  "feedback-meaning", "feedback-translation", "feedback-source", "retry-note", "next-button", "result-session-number", "result-message",
  "result-accuracy", "result-correct", "result-wrong", "result-mastered", "return-button", "keyboard-hint", "app-error",
];
const elements = new Map(ids.map((id) => [id, new MiniElement("div", id)]));
for (const id of ["home-button", "start-button", "next-button", "return-button", "kana-backspace", "kana-clear", "kana-submit"]) elements.get(id).tagName = "BUTTON";
elements.get("start-screen").classList.add("is-active");
elements.get("difficulty-basic").checked = true;
elements.get("mode-kanji-reading").checked = true;
elements.get("choice-count-4").checked = true;
elements.get("general-question-count").value = "480";
elements.get("general-question-count").max = "480";
elements.get("sentence-question-count").value = "20";
elements.get("sentence-question-count").max = "480";
elements.get("question-count-panel").hidden = true;
elements.get("katakana-mode-note").hidden = true;
elements.get("record-katakana-meaning").hidden = true;
elements.get("exam-mode-note").hidden = true;
elements.get("exam-timer").hidden = true;
elements.get("exam-mistake-badge").hidden = true;
elements.get("kana-composer").hidden = true;
elements.get("next-button").hidden = true;
elements.get("feedback").hidden = true;

const documentListeners = {};
globalThis.document = {
  getElementById: (id) => elements.get(id),
  createElement: (tagName) => new MiniElement(tagName),
  addEventListener: (type, handler) => { (documentListeners[type] ||= []).push(handler); },
};
globalThis.window = globalThis;
globalThis.window.scrollTo = () => {};
const storage = new Map();
const legacyKanjiReadingId = globalThis.VOCAB_DATA[0].id;
const legacyKanaId = globalThis.VOCAB_DATA[1].id;
storage.set("jlpt-vocab-quiz-progress-v1", JSON.stringify({
  mistakeCounts: {
    [legacyKanjiReadingId]: 2,
    [`kanji-to-kana:${legacyKanaId}`]: 1,
  },
}));
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};

let nextTimerId = 1;
let fakeNow = 1_000_000;
Date.now = () => fakeNow;
const intervalCallbacks = new Map();
globalThis.setInterval = (callback) => {
  const timerId = nextTimerId;
  nextTimerId += 1;
  intervalCallbacks.set(timerId, callback);
  return timerId;
};
globalThis.clearInterval = (timerId) => intervalCallbacks.delete(timerId);

function tickTimers(seconds = 1) {
  for (let second = 0; second < seconds; second += 1) {
    fakeNow += 1000;
    [...intervalCallbacks.values()].forEach((callback) => callback());
  }
}

function elapseWithoutTimerCallbacks(milliseconds) {
  fakeNow += milliseconds;
}

function runTimerCallbacks() {
  [...intervalCallbacks.values()].forEach((callback) => callback());
}

require("./app.js");

function pressKey(key, code = key) {
  const event = { key, code, preventDefault() { this.defaultPrevented = true; } };
  for (const handler of documentListeners.keydown || []) handler(event);
  return event;
}

function correctButtonForCurrentWord() {
  const word = elements.get("quiz-word").textContent;
  const quizData = elements.get("difficulty-n3").checked
    ? globalThis.N3_VOCAB_DATA
    : elements.get("difficulty-n2").checked
      ? globalThis.N2_VOCAB_DATA
      : globalThis.VOCAB_DATA;
  const buttons = elements.get("answer-grid").querySelectorAll("button");
  const shownIds = new Set(buttons.map((button) => button.dataset.itemId));
  const item = quizData.find(
    (candidate) => candidate.word === word && shownIds.has(candidate.id),
  );
  assert.ok(item, `현재 단어 ${word}를 데이터에서 찾을 수 있어야 합니다.`);
  return buttons.find((button) => button.dataset.itemId === item.id);
}

function correctButtonForCurrentKatakana() {
  const word = elements.get("quiz-word").textContent;
  const item = globalThis.KATAKANA_VOCAB_DATA.find((candidate) => candidate.word === word);
  assert.ok(item, `현재 카타카나 단어 ${word}를 데이터에서 찾을 수 있어야 합니다.`);
  const button = elements.get("answer-grid").querySelectorAll("button").find(
    (candidate) => candidate.dataset.itemId === item.id,
  );
  assert.ok(button, `${word} 정답 뜻이 선택지에 있어야 합니다.`);
  return button;
}

function correctButtonForCurrentSentence() {
  const shownSentence = elements.get("quiz-word").textContent;
  const sentenceData = elements.get("difficulty-n3").checked
    ? globalThis.N3_VOCAB_DATA
    : elements.get("difficulty-n2").checked
      ? globalThis.N2_VOCAB_DATA
      : globalThis.VOCAB_DATA;
  const buttons = elements.get("answer-grid").querySelectorAll("button");
  const shownIds = new Set(buttons.map((button) => button.dataset.itemId));
  const item = sentenceData.find(
    (candidate) => candidate.sentence?.replace("___", "＿＿＿") === shownSentence
      && shownIds.has(candidate.id),
  );
  assert.ok(item, `현재 예문 ${shownSentence}을 데이터에서 찾을 수 있어야 합니다.`);
  const correctButton = buttons.find(
    (button) => button.dataset.itemId === item.id,
  );
  assert.ok(correctButton, `${item.word} 정답 버튼이 선택지에 있어야 합니다.`);
  return correctButton;
}

function kanaReadingForTest(reading) {
  return globalThis.QuizEngine.kanaReadings(reading)[0] || "";
}

function currentKanaItem() {
  const word = elements.get("quiz-word").textContent;
  const quizData = elements.get("difficulty-n3").checked
    ? globalThis.N3_VOCAB_DATA
    : elements.get("difficulty-n2").checked
      ? globalThis.N2_VOCAB_DATA
      : globalThis.VOCAB_DATA;
  const item = quizData.find((candidate) => candidate.word === word);
  assert.ok(item, `현재 히라가나 조합 단어 ${word}를 찾을 수 있어야 합니다.`);
  return item;
}

function enterCurrentKanaReading() {
  const reading = kanaReadingForTest(currentKanaItem().reading);
  const tiles = elements.get("kana-grid").querySelectorAll("button");
  for (const character of reading) {
    const tile = tiles.find((button) => button.dataset.kana === character);
    assert.ok(tile, `정답 히라가나 ${character} 타일이 있어야 합니다.`);
    tile.click();
  }
  return reading;
}

assert.equal(elements.get("general-question-count-panel").hidden, false, "일반 모드에는 문제 수 선택이 보여야 합니다.");
assert.equal(elements.get("general-question-count").value, "480");
assert.match(elements.get("general-question-count-hint").textContent, /10~480/);
elements.get("start-button").click();
assert.ok(elements.get("quiz-screen").classList.contains("is-active"), "시작하면 문제 화면이 열려야 합니다.");
assert.equal(elements.get("answer-grid").querySelectorAll("button").length, 4, "선택지는 네 개여야 합니다.");

const firstWord = elements.get("quiz-word").textContent;
const correctFirst = correctButtonForCurrentWord();
const firstItemId = correctFirst.dataset.itemId;
const firstButtons = elements.get("answer-grid").querySelectorAll("button");
const wrongFirstIndex = firstButtons.findIndex((button) => button !== correctFirst);
const wrongFirstItem = globalThis.VOCAB_DATA.find(
  (item) => item.id === firstButtons[wrongFirstIndex].dataset.itemId,
);
const numberEvent = pressKey(String(wrongFirstIndex + 1), `Digit${wrongFirstIndex + 1}`);
assert.equal(numberEvent.defaultPrevented, true, "숫자키 입력 시 브라우저 기본 동작을 막아야 합니다.");
assert.equal(elements.get("retry-note").hidden, false, "오답은 다시 나온다는 안내가 보여야 합니다.");
assert.equal(
  elements.get("feedback-selected").textContent,
  `선택한 답  ${globalThis.QuizEngine.normalizedReading(wrongFirstItem.reading)} · ${wrongFirstItem.word} · ${wrongFirstItem.meaning}`,
  "읽기 문제에서 틀리게 고른 답의 단어와 뜻을 보여줘야 합니다.",
);
assert.match(elements.get("feedback-reading").textContent, /^읽기/);
assert.match(elements.get("feedback-meaning").textContent, /^뜻/);

for (let index = 0; index < 3; index += 1) {
  if (index === 0) pressKey("Enter", "Enter"); else elements.get("next-button").click();
  correctButtonForCurrentWord().click();
}
elements.get("next-button").click();
assert.equal(elements.get("quiz-word").textContent, firstWord, "틀린 단어는 세 문제 뒤에 다시 나와야 합니다.");
const retryButtons = elements.get("answer-grid").querySelectorAll("button");
const retryCorrectIndex = retryButtons.indexOf(correctButtonForCurrentWord());
pressKey("End", `Numpad${retryCorrectIndex + 1}`);
assert.equal(elements.get("feedback-title").textContent, "정답이에요", "숫자패드로 정답을 선택할 수 있어야 합니다.");

let guard = 0;
while (!elements.get("result-screen").classList.contains("is-active") && guard < 500) {
  elements.get("next-button").click();
  if (elements.get("result-screen").classList.contains("is-active")) break;
  correctButtonForCurrentWord().click();
  guard += 1;
}
assert.ok(elements.get("result-screen").classList.contains("is-active"), "모든 단어를 익히면 결과 화면이 열려야 합니다.");
assert.equal(elements.get("result-wrong").textContent, 1);
assert.equal(elements.get("result-mastered").textContent, 480);
const firstPracticeProgress = JSON.parse(storage.get("jlpt-vocab-quiz-progress-v1"));
assert.equal(
  Object.hasOwn(firstPracticeProgress.mistakeCounts, legacyKanjiReadingId),
  false,
  "구형 단어 ID 오답 기록을 제거해야 합니다.",
);
assert.equal(
  Object.hasOwn(firstPracticeProgress.mistakeCounts, `kanji-to-kana:${legacyKanaId}`),
  false,
  "난이도가 없던 구형 오답 기록을 제거해야 합니다.",
);
assert.ok(
  Object.hasOwn(firstPracticeProgress.mistakeCounts, `n5n4:kanji-to-reading:${legacyKanjiReadingId}`),
  "구형 오답 기록을 난이도·모드별 키로 이전해야 합니다.",
);
assert.equal(
  firstPracticeProgress.mistakeCounts[`n5n4:kanji-to-kana:${legacyKanaId}`],
  1,
  "다른 학습 모드의 구형 오답 횟수를 보존해야 합니다.",
);
assert.equal(firstPracticeProgress.practiceSessionCount, 1, "일반 단어 연습 회차를 별도로 기록해야 합니다.");
assert.equal(
  firstPracticeProgress.practiceCleanStreaks[`n5n4:kanji-to-reading:${firstItemId}`],
  0,
  "한 번 틀린 뒤 맞힌 단어는 무오답 연속 횟수가 올라가면 안 됩니다.",
);
assert.ok(
  Object.values(firstPracticeProgress.practiceCleanStreaks).some((count) => count === 1),
  "한 번에 맞힌 단어는 무오답 연속 횟수가 올라가야 합니다.",
);

elements.get("return-button").click();
assert.ok(elements.get("start-screen").classList.contains("is-active"));
assert.equal(elements.get("next-session-number").textContent, 2, "같은 난이도·모드의 다음 회차가 표시되어야 합니다.");
assert.equal(elements.get("kanji-reading-sessions").textContent, "1회", "한자→읽기 완료 회차를 따로 기록해야 합니다.");
assert.notEqual(elements.get("kanji-reading-last-accuracy").textContent, "—", "한자→읽기 정답률을 따로 기록해야 합니다.");
assert.equal(elements.get("reading-kanji-sessions").textContent, "0회", "아직 풀지 않은 모드는 별도 기록이어야 합니다.");
assert.equal(elements.get("history-panel").hidden, false, "최근 회차 기록이 보여야 합니다.");

elements.get("mode-kanji-reading").checked = false;
elements.get("mode-reading-kanji").checked = true;
elements.get("difficulty-basic").checked = false;
elements.get("difficulty-n2").checked = true;
elements.get("difficulty-n2").dispatch("change");
assert.equal(elements.get("start-selection-label").textContent, "N2 · 읽기→한자");
assert.equal(elements.get("next-session-number").textContent, 1, "다른 난이도·모드는 1회차부터 시작해야 합니다.");
elements.get("start-button").click();
assert.equal(elements.get("quiz-prompt").textContent, "이 읽기에 알맞은 단어는 무엇일까요?");
assert.match(elements.get("quiz-session-label").textContent, /읽기→한자/);
assert.match(elements.get("quiz-session-label").textContent, /N2/);
assert.match(elements.get("quiz-session-label").textContent, /^1회차/, "N2 읽기→한자는 독립된 회차여야 합니다.");
assert.equal(elements.get("quiz-progress-text").textContent, "1 / 100");
assert.match(elements.get("day-label").textContent, /^N2 · /);
const shownReading = elements.get("quiz-word").textContent;
const reverseButtons = elements.get("answer-grid").querySelectorAll("button");
const reverseCorrect = reverseButtons.filter((button) => {
  const item = globalThis.N2_VOCAB_DATA.find((candidate) => candidate.id === button.dataset.itemId);
  return globalThis.QuizEngine.normalizedReading(item.reading) === shownReading;
});
assert.equal(reverseCorrect.length, 1, "읽기→한자 모드에는 정답 한 개만 있어야 합니다.");
const reverseWrong = reverseButtons.find((button) => button !== reverseCorrect[0]);
const reverseWrongItem = globalThis.N2_VOCAB_DATA.find(
  (item) => item.id === reverseWrong.dataset.itemId,
);
reverseWrong.click();
assert.equal(elements.get("feedback-title").textContent, "아쉬워요, 정답을 확인하세요");
assert.equal(
  elements.get("feedback-selected").textContent,
  `선택한 답  ${reverseWrongItem.word}（${globalThis.QuizEngine.normalizedReading(reverseWrongItem.reading)}） · ${reverseWrongItem.meaning}`,
  "읽기→한자 문제에서 선택한 오답의 읽기와 뜻을 보여줘야 합니다.",
);
assert.match(elements.get("feedback-reading").textContent, /^정답/);
assert.match(elements.get("feedback-meaning").textContent, /^뜻/);

guard = 0;
while (!elements.get("result-screen").classList.contains("is-active") && guard < 150) {
  elements.get("next-button").click();
  if (elements.get("result-screen").classList.contains("is-active")) break;
  const reading = elements.get("quiz-word").textContent;
  const buttons = elements.get("answer-grid").querySelectorAll("button");
  const correct = buttons.filter((button) => {
    const item = globalThis.N2_VOCAB_DATA.find((candidate) => candidate.id === button.dataset.itemId);
    return globalThis.QuizEngine.normalizedReading(item.reading) === reading;
  });
  assert.equal(correct.length, 1, `${reading}의 N2 정답은 한 개여야 합니다.`);
  correct[0].click();
  guard += 1;
}
assert.ok(elements.get("result-screen").classList.contains("is-active"), "N2의 모든 단어를 풀면 결과 화면이 열려야 합니다.");
assert.equal(elements.get("result-mastered").textContent, 100);

elements.get("return-button").click();
assert.equal(elements.get("reading-kanji-sessions").textContent, "1회", "N2 읽기→한자 완료 회차를 따로 기록해야 합니다.");
assert.notEqual(elements.get("reading-kanji-total-accuracy").textContent, "—", "N2 읽기→한자 누적 정답률을 보여줘야 합니다.");
elements.get("mode-reading-kanji").checked = false;
elements.get("mode-sentence-kanji").checked = true;
elements.get("difficulty-n2").checked = false;
elements.get("difficulty-basic").checked = true;
elements.get("mode-sentence-kanji").dispatch("change");
assert.equal(elements.get("question-count-panel").hidden, false, "문장 모드에서는 문제 수 선택이 보여야 합니다.");
assert.equal(elements.get("general-question-count-panel").hidden, true, "문장 모드에서는 일반 문제 수 선택을 숨겨야 합니다.");
assert.equal(elements.get("difficulty-basic").disabled, false, "N5·N4에서도 문장 모드를 선택할 수 있어야 합니다.");
assert.equal(elements.get("difficulty-basic").checked, true);
assert.equal(elements.get("sentence-question-count").max, "480");
assert.match(elements.get("sentence-question-count-hint").textContent, /10~480/);
elements.get("sentence-question-count").value = "10";
elements.get("start-button").click();
assert.equal(elements.get("quiz-prompt").textContent, "문장의 빈칸에 알맞은 한자 단어는 무엇일까요?");
assert.match(elements.get("quiz-session-label").textContent, /문장 빈칸→한자/);
assert.equal(elements.get("quiz-progress-text").textContent, "1 / 10");
assert.match(elements.get("quiz-word").textContent, /＿＿＿/);
assert.ok(elements.get("quiz-word").classList.contains("is-sentence"));
const missedSentence = elements.get("quiz-word").textContent;
const sentenceCorrect = correctButtonForCurrentSentence();
const sentenceWrongs = elements.get("answer-grid").querySelectorAll("button").filter(
  (button) => button !== sentenceCorrect,
);
sentenceWrongs[0].click();
const firstWrongSentenceItem = globalThis.VOCAB_DATA.find(
  (item) => item.id === sentenceWrongs[0].dataset.itemId,
);
assert.match(elements.get("quiz-word").innerHTML, /sentence-blank/, "첫 오답에는 후리가나 문장이 표시되어야 합니다.");
assert.equal(elements.get("feedback-title").textContent, "한 번 더 생각해 보세요");
assert.equal(
  elements.get("feedback-selected").textContent,
  `선택한 답  ${firstWrongSentenceItem.word}（${globalThis.QuizEngine.normalizedReading(firstWrongSentenceItem.reading)}） · ${firstWrongSentenceItem.meaning}`,
);
assert.equal(elements.get("feedback-translation").hidden, true, "첫 오답에는 문장 해석을 숨겨야 합니다.");
assert.equal(elements.get("next-button").hidden, true, "첫 오답 후에는 같은 문제에 다시 답해야 합니다.");
assert.equal(sentenceWrongs[0].disabled, true);
assert.equal(sentenceCorrect.classList.contains("is-correct"), false, "첫 오답에는 정답을 공개하지 않아야 합니다.");

sentenceWrongs[1].click();
const secondWrongSentenceItem = globalThis.VOCAB_DATA.find(
  (item) => item.id === sentenceWrongs[1].dataset.itemId,
);
assert.equal(
  elements.get("feedback-selected").textContent,
  `선택한 답  ${secondWrongSentenceItem.word}（${globalThis.QuizEngine.normalizedReading(secondWrongSentenceItem.reading)}） · ${secondWrongSentenceItem.meaning}`,
);
assert.match(elements.get("feedback-reading").textContent, /^정답.+（.+）$/);
assert.match(elements.get("feedback-meaning").textContent, /^뜻/);
assert.equal(elements.get("feedback-translation").hidden, false, "두 번째 오답에는 문장 해석을 보여야 합니다.");
assert.match(elements.get("feedback-translation").textContent, /^문장 해석/);
assert.equal(elements.get("retry-note").hidden, false, "두 번 틀린 문장은 다시 나온다고 안내해야 합니다.");

for (let index = 0; index < 3; index += 1) {
  elements.get("next-button").click();
  correctButtonForCurrentSentence().click();
}
elements.get("next-button").click();
assert.equal(elements.get("quiz-word").textContent, missedSentence, "두 번 틀린 문장은 세 문제 뒤에 다시 나와야 합니다.");
correctButtonForCurrentSentence().click();

guard = 0;
while (!elements.get("result-screen").classList.contains("is-active") && guard < 20) {
  elements.get("next-button").click();
  if (elements.get("result-screen").classList.contains("is-active")) break;
  correctButtonForCurrentSentence().click();
  guard += 1;
}
assert.ok(elements.get("result-screen").classList.contains("is-active"), "선택한 문장 문제를 풀면 결과 화면이 열려야 합니다.");
assert.equal(elements.get("result-mastered").textContent, 10);
assert.equal(elements.get("result-wrong").textContent, 2);

elements.get("return-button").click();
elements.get("mode-sentence-kanji").checked = false;
elements.get("mode-kanji-reading").checked = true;
elements.get("mode-kanji-reading").dispatch("change");
elements.get("difficulty-n2").checked = false;
elements.get("difficulty-basic").checked = true;
elements.get("difficulty-basic").dispatch("change");
assert.equal(elements.get("general-question-count-panel").hidden, false);
assert.equal(elements.get("general-question-count").max, "480");
elements.get("general-question-count").value = "10";
elements.get("start-button").click();
assert.equal(elements.get("quiz-progress-text").textContent, "1 / 10", "일반 모드도 문제 수를 선택할 수 있어야 합니다.");

guard = 0;
while (!elements.get("result-screen").classList.contains("is-active") && guard < 20) {
  correctButtonForCurrentWord().click();
  elements.get("next-button").click();
  guard += 1;
}
assert.ok(elements.get("result-screen").classList.contains("is-active"));
assert.equal(elements.get("result-mastered").textContent, 10);
const secondCleanProgress = JSON.parse(storage.get("jlpt-vocab-quiz-progress-v1"));
const n5PracticeCooldowns = Object.entries(secondCleanProgress.practiceCooldowns).filter(
  ([key]) => key.startsWith("n5n4:kanji-to-reading:"),
);
assert.ok(n5PracticeCooldowns.length > 0, "2회 연속 무오답 단어는 복습 대기 상태가 되어야 합니다.");
assert.ok(
  n5PracticeCooldowns.every(([, eligibleRound]) => eligibleRound === 6),
  "2회 연속 무오답 단어는 다음 2번의 단어 연습 회차 동안 쉬어야 합니다.",
);

elements.get("return-button").click();
elements.get("mode-kanji-reading").checked = false;
elements.get("mode-sentence-kanji").checked = true;
elements.get("mode-sentence-kanji").dispatch("change");
elements.get("difficulty-basic").checked = false;
elements.get("difficulty-n2").checked = true;
elements.get("difficulty-n2").dispatch("change");
assert.equal(elements.get("sentence-question-count").max, "100");
assert.match(elements.get("sentence-question-count-hint").textContent, /10~100/);
elements.get("sentence-question-count").value = "100";
elements.get("start-button").click();
assert.equal(elements.get("quiz-progress-text").textContent, "1 / 100", "문장 모드는 최대 100문제까지 선택할 수 있어야 합니다.");
assert.equal(elements.get("answer-grid").querySelectorAll("button").length, 4);

elements.get("home-button").click();
assert.ok(elements.get("start-screen").classList.contains("is-active"), "아이콘을 누르면 처음 화면으로 돌아가야 합니다.");
assert.equal(elements.get("quiz-screen").classList.contains("is-active"), false);

elements.get("mode-sentence-kanji").checked = false;
elements.get("mode-kanji-reading").checked = true;
elements.get("difficulty-basic").checked = false;
elements.get("difficulty-n2").checked = false;
elements.get("difficulty-n3").checked = true;
elements.get("choice-count-4").checked = false;
elements.get("choice-count-8").checked = true;
elements.get("difficulty-n3").dispatch("change");
assert.equal(elements.get("general-question-count-panel").hidden, false);
assert.equal(elements.get("general-question-count").max, "1323");
assert.match(elements.get("general-question-count-hint").textContent, /10~1323/);
elements.get("general-question-count").value = "10";
elements.get("start-button").click();
assert.match(elements.get("quiz-session-label").textContent, /N3/);
assert.equal(elements.get("quiz-progress-text").textContent, "1 / 10");
assert.match(elements.get("day-label").textContent, /^N3 · /);
assert.equal(elements.get("answer-grid").querySelectorAll("button").length, 8);
assert.match(elements.get("quiz-session-label").textContent, /8지선다/);
assert.match(elements.get("keyboard-hint").textContent, /1–8/);
const keyEightEvent = pressKey("8", "Digit8");
assert.equal(keyEightEvent.defaultPrevented, true, "8지선다에서는 숫자키 8로 선택할 수 있어야 합니다.");
assert.equal(elements.get("feedback").hidden, false);

elements.get("home-button").click();
elements.get("mode-kanji-reading").checked = false;
elements.get("mode-sentence-kanji").checked = true;
elements.get("choice-count-8").checked = false;
elements.get("choice-count-6").checked = true;
elements.get("mode-sentence-kanji").dispatch("change");
assert.equal(elements.get("sentence-question-count").max, "500");
assert.match(elements.get("sentence-question-count-hint").textContent, /10~500/);
elements.get("sentence-question-count").value = "10";
elements.get("start-button").click();
assert.equal(elements.get("quiz-progress-text").textContent, "1 / 10");
assert.match(elements.get("quiz-word").textContent, /＿＿＿/);
assert.match(elements.get("day-label").textContent, /^N3 · 문장 빈칸 · /);
assert.equal(elements.get("answer-grid").querySelectorAll("button").length, 6);
assert.match(elements.get("quiz-session-label").textContent, /6지선다/);
assert.match(elements.get("keyboard-hint").textContent, /1–6/);
correctButtonForCurrentSentence().click();
assert.equal(elements.get("feedback-title").textContent, "정답이에요");

elements.get("home-button").click();
elements.get("mode-sentence-kanji").checked = false;
elements.get("mode-kanji-reading").checked = true;
elements.get("choice-count-6").checked = false;
elements.get("choice-count-4").checked = true;
elements.get("exam-mode").checked = true;
elements.get("exam-mode").dispatch("change");
assert.equal(elements.get("exam-mode-state").textContent, "ON");
assert.equal(elements.get("exam-mode-note").hidden, false, "시험 모드 안내를 표시해야 합니다.");
assert.equal(elements.get("general-question-count").disabled, true, "시험 모드는 문제 수 입력을 잠가야 합니다.");
assert.equal(elements.get("general-question-count").value, "100");
assert.match(elements.get("general-question-count-hint").textContent, /100문제 고정/);
assert.equal(elements.get("start-button").textContent, "100문제 시험 시작");
assert.equal(elements.get("start-button").disabled, false);

elements.get("start-button").click();
assert.match(elements.get("quiz-session-label").textContent, /시험 모드/);
assert.equal(elements.get("quiz-progress-text").textContent, "1 / 100");
assert.equal(elements.get("exam-timer").hidden, false);
assert.equal(elements.get("exam-time-left").textContent, 7, "단어 시험 제한시간은 7초여야 합니다.");
const timedOutExamWord = elements.get("quiz-word").textContent;
tickTimers(1);
assert.equal(elements.get("exam-time-left").textContent, 6);
elapseWithoutTimerCallbacks(6000);
runTimerCallbacks();
assert.match(elements.get("feedback-title").textContent, /시간이 초과/);
assert.equal(elements.get("feedback-selected").textContent, "선택한 답  시간 초과");
assert.match(elements.get("exam-mistake-badge").textContent, /1회 틀렸습니다/);
assert.equal(elements.get("quiz-progress-text").textContent, "2 / 100", "시간 초과도 한 문제 오답 완료로 처리해야 합니다.");

elements.get("next-button").click();
assert.equal(elements.get("exam-time-left").textContent, 7);
correctButtonForCurrentWord().click();

guard = 0;
while (!elements.get("result-screen").classList.contains("is-active") && guard < 120) {
  elements.get("next-button").click();
  if (elements.get("result-screen").classList.contains("is-active")) break;
  correctButtonForCurrentWord().click();
  guard += 1;
}
assert.ok(elements.get("result-screen").classList.contains("is-active"), "시험은 정확히 100문제를 풀면 끝나야 합니다.");
assert.equal(elements.get("result-mastered").textContent, 100);
assert.equal(elements.get("result-correct").textContent, 99);
assert.equal(elements.get("result-wrong").textContent, 1);
const savedExamProgress = JSON.parse(storage.get("jlpt-vocab-quiz-progress-v1"));
const n3ExamCooldowns = Object.entries(savedExamProgress.examCooldowns).filter(
  ([key]) => key.startsWith("n3:kanji-to-reading:"),
);
assert.equal(n3ExamCooldowns.length, 99, "시험에서 맞힌 99문제에 3회독 제외 정보를 저장해야 합니다.");
assert.ok(n3ExamCooldowns.every(([, eligibleSession]) => eligibleSession === 5));

elements.get("return-button").click();
elements.get("start-button").click();
guard = 0;
let foundPreviousMistake = false;
while (!foundPreviousMistake && guard < 100) {
  if (elements.get("quiz-word").textContent === timedOutExamWord) {
    foundPreviousMistake = true;
    assert.match(elements.get("exam-mistake-badge").textContent, /1회 틀렸습니다/);
    break;
  }
  correctButtonForCurrentWord().click();
  elements.get("next-button").click();
  guard += 1;
}
assert.equal(foundPreviousMistake, true, "이전에 틀린 시험 문제에는 누적 오답 횟수를 표시해야 합니다.");

elements.get("home-button").click();
elements.get("mode-kanji-reading").checked = false;
elements.get("mode-sentence-kanji").checked = true;
elements.get("mode-sentence-kanji").dispatch("change");
elements.get("start-button").click();
assert.equal(elements.get("exam-time-left").textContent, 13, "문장 시험 제한시간은 13초여야 합니다.");
const examSentenceCorrect = correctButtonForCurrentSentence();
const examSentenceWrong = elements.get("answer-grid").querySelectorAll("button").find(
  (button) => button !== examSentenceCorrect,
);
examSentenceWrong.click();
assert.match(elements.get("feedback-title").textContent, /오답이에요/);
assert.equal(elements.get("feedback-translation").hidden, false, "시험 문장 오답은 즉시 문장 해석을 보여줘야 합니다.");
assert.equal(elements.get("next-button").hidden, false, "시험 오답은 재시도 없이 다음 문제로 넘어가야 합니다.");
assert.equal(elements.get("quiz-progress-text").textContent, "2 / 100");

elements.get("home-button").click();
elements.get("mode-sentence-kanji").checked = false;
elements.get("mode-kanji-reading").checked = true;
elements.get("difficulty-n3").checked = false;
elements.get("difficulty-n2").checked = true;
elements.get("difficulty-n2").dispatch("change");
assert.equal(elements.get("start-button").disabled, false);
elements.get("start-button").click();
guard = 0;
while (!elements.get("result-screen").classList.contains("is-active") && guard < 110) {
  correctButtonForCurrentWord().click();
  elements.get("next-button").click();
  guard += 1;
}
assert.ok(elements.get("result-screen").classList.contains("is-active"));
assert.equal(elements.get("result-correct").textContent, 100);
elements.get("return-button").click();
assert.equal(elements.get("start-button").disabled, true, "3회독 보호로 100문제를 채울 수 없으면 시험 시작을 막아야 합니다.");
assert.match(elements.get("exam-mode-note").textContent, /출제 가능한 문제가 0개/);

elements.get("exam-mode").checked = false;
elements.get("exam-mode").dispatch("change");
assert.equal(elements.get("exam-mode-state").textContent, "OFF");
assert.equal(elements.get("general-question-count").disabled, false);
assert.equal(elements.get("start-button").disabled, false);
assert.equal(elements.get("exam-mode-note").hidden, true);

elements.get("mode-kanji-reading").checked = false;
elements.get("mode-reading-kanji").checked = false;
elements.get("mode-sentence-kanji").checked = false;
elements.get("mode-kanji-kana").checked = true;
elements.get("difficulty-n2").checked = false;
elements.get("difficulty-basic").checked = true;
elements.get("mode-kanji-kana").dispatch("change");
assert.equal(elements.get("start-selection-label").textContent, "N5·N4 · 한자→히라가나 조합");
assert.equal(elements.get("choice-count-picker").hidden, true, "히라가나 조합 모드는 선택지 수 설정을 숨겨야 합니다.");
assert.equal(elements.get("record-kanji-kana").classList.contains("is-selected"), true);
elements.get("general-question-count").value = "10";
elements.get("start-button").click();
assert.match(elements.get("quiz-prompt").textContent, /히라가나를 순서대로/);
assert.equal(elements.get("answer-grid").hidden, true);
assert.equal(elements.get("kana-composer").hidden, false);
assert.equal(elements.get("kana-grid").querySelectorAll("button").length, 9, "히라가나 타일은 정확히 9개여야 합니다.");
const kanaNineEvent = pressKey("9", "Digit9");
assert.equal(kanaNineEvent.defaultPrevented, true, "숫자키 9로 아홉 번째 히라가나를 선택할 수 있어야 합니다.");
assert.notEqual(elements.get("kana-answer").textContent, "히라가나를 선택하세요");
const kanaBackspaceEvent = pressKey("Backspace", "Backspace");
assert.equal(kanaBackspaceEvent.defaultPrevented, true);
assert.equal(elements.get("kana-answer").textContent, "히라가나를 선택하세요");
const correctKanaReading = enterCurrentKanaReading();
assert.equal(elements.get("kana-answer").textContent, correctKanaReading);
pressKey("Enter", "Enter");
assert.equal(elements.get("feedback-title").textContent, "정답이에요");
assert.match(elements.get("feedback-reading").textContent, /^정답 읽기/);

elements.get("next-button").click();
const nextKanaCorrect = kanaReadingForTest(currentKanaItem().reading);
const firstKanaTile = elements.get("kana-grid").querySelectorAll("button")[0];
firstKanaTile.click();
if (elements.get("kana-answer").textContent === nextKanaCorrect) firstKanaTile.click();
const wrongKanaAnswer = elements.get("kana-answer").textContent;
elements.get("kana-submit").click();
assert.equal(elements.get("feedback-title").textContent, "아쉬워요, 정답을 확인하세요");
assert.equal(elements.get("feedback-selected").textContent, `선택한 답  ${wrongKanaAnswer}`);
assert.equal(elements.get("retry-note").hidden, false, "틀린 히라가나 조합 문제는 다시 출제해야 합니다.");

elements.get("home-button").click();
elements.get("exam-mode").checked = true;
elements.get("exam-mode").dispatch("change");
assert.equal(elements.get("start-button").disabled, false);
elements.get("start-button").click();
assert.equal(elements.get("quiz-progress-text").textContent, "1 / 100");
assert.equal(elements.get("exam-time-left").textContent, 10, "히라가나 조합 시험 제한시간은 10초여야 합니다.");
assert.equal(elements.get("kana-grid").querySelectorAll("button").length, 9);
assert.match(elements.get("quiz-session-label").textContent, /히라가나 9개/);
elements.get("home-button").click();
elements.get("exam-mode").checked = false;
elements.get("exam-mode").dispatch("change");

elements.get("mode-kanji-kana").checked = false;
elements.get("mode-katakana-meaning").checked = true;
elements.get("choice-count-4").checked = false;
elements.get("choice-count-8").checked = true;
elements.get("mode-katakana-meaning").dispatch("change");
assert.equal(elements.get("difficulty-picker").hidden, true, "카타카나 모드에서는 JLPT 난이도 선택을 숨겨야 합니다.");
assert.equal(elements.get("katakana-mode-note").hidden, false);
assert.equal(elements.get("start-selection-label").textContent, "카타카나 · 카타카나→뜻");
assert.equal(elements.get("record-katakana-meaning").hidden, false);
assert.equal(elements.get("record-katakana-meaning").classList.contains("is-selected"), true);
assert.equal(elements.get("record-kanji-reading").hidden, true);
assert.equal(elements.get("general-question-count").max, "100");
assert.match(elements.get("general-question-count-hint").textContent, /카타카나 기초 단어 100개/);
elements.get("general-question-count").value = "10";
elements.get("start-button").click();
assert.equal(elements.get("quiz-prompt").textContent, "이 카타카나 단어의 뜻은 무엇일까요?");
assert.match(elements.get("quiz-word").textContent, /^[ァ-ヶー]+$/);
assert.equal(elements.get("answer-grid").querySelectorAll("button").length, 8);
const firstKatakanaCorrect = correctButtonForCurrentKatakana();
const firstKatakanaCorrectIndex = elements.get("answer-grid").querySelectorAll("button").indexOf(firstKatakanaCorrect);
const katakanaNumberEvent = pressKey(String(firstKatakanaCorrectIndex + 1), `Digit${firstKatakanaCorrectIndex + 1}`);
assert.equal(katakanaNumberEvent.defaultPrevented, true);
assert.equal(elements.get("feedback-title").textContent, "정답이에요");
assert.match(elements.get("feedback-reading").textContent, /^정답 뜻/);
assert.match(elements.get("feedback-meaning").textContent, /^단어/);

guard = 0;
while (!elements.get("result-screen").classList.contains("is-active") && guard < 20) {
  elements.get("next-button").click();
  if (elements.get("result-screen").classList.contains("is-active")) break;
  correctButtonForCurrentKatakana().click();
  guard += 1;
}
assert.ok(elements.get("result-screen").classList.contains("is-active"));
assert.equal(elements.get("result-mastered").textContent, 10);
elements.get("return-button").click();
assert.equal(elements.get("katakana-meaning-sessions").textContent, "1회");
assert.notEqual(elements.get("katakana-meaning-total-accuracy").textContent, "—");

elements.get("exam-mode").checked = true;
elements.get("exam-mode").dispatch("change");
assert.equal(elements.get("start-button").disabled, false);
elements.get("start-button").click();
assert.equal(elements.get("quiz-progress-text").textContent, "1 / 100");
assert.equal(elements.get("exam-time-left").textContent, 7, "카타카나 시험 제한시간은 7초여야 합니다.");
assert.match(elements.get("quiz-session-label").textContent, /카타카나→뜻/);

console.log("app interaction flow tests passed");
