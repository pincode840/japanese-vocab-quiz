"use strict";

const assert = require("node:assert/strict");
const ReadingRenderer = require("./reading-renderer.js");
const SessionStore = require("./session-store.js");

const renderer = ReadingRenderer.create({
  図書館: "としょかん",
  図: "ず",
  行く: "いく",
});
assert.equal(
  renderer.toHtml("図書館へ行く", {}, true),
  '<ruby>図書館<rt aria-hidden="true">としょかん</rt></ruby>へ<ruby>行く<rt aria-hidden="true">いく</rt></ruby>',
  "긴 복합어 읽기를 먼저 적용해야 합니다.",
);
assert.equal(renderer.toHtml("<図書館>", {}, false), "&lt;図書館&gt;");
assert.equal(renderer.toAccessibleText("図書館へ行く", {}, true), "図書館（としょかん）へ行く（いく）");

const target = {
  innerHTML: "",
  attributes: {},
  setAttribute(name, value) { this.attributes[name] = value; },
};
renderer.render(target, "図書館", {}, true);
assert.match(target.innerHTML, /<ruby>/);
assert.equal(target.attributes["aria-label"], "図書館（としょかん）");

const storageValues = new Map();
const storage = {
  getItem: (key) => storageValues.get(key) ?? null,
  setItem: (key, value) => storageValues.set(key, value),
  removeItem: (key) => storageValues.delete(key),
};
const store = SessionStore.create(storage, () => 12345);
const vocabSession = {
  number: 2,
  queue: ["word-2"],
  baseIds: new Set(["word-1", "word-2"]),
  masteredIds: new Set(["word-1"]),
  mistakenIds: new Set(),
  correctIds: new Set(["word-1"]),
  current: { id: "word-1", word: "学校" },
  answered: false,
};
assert.equal(store.save("vocab", vocabSession), true);
const savedVocab = store.load();
assert.equal(savedVocab.savedAt, 12345);
assert.equal(savedVocab.session.currentId, "word-1");
assert.deepEqual(savedVocab.session.baseIds, ["word-1", "word-2"]);

const hydratedVocab = SessionStore.hydrateVocab(savedVocab.session);
assert.ok(hydratedVocab.baseIds instanceof Set);
assert.ok(hydratedVocab.masteredIds.has("word-1"));
assert.equal(hydratedVocab.current, null);

const readingData = [{
  id: "reading-1",
  passage: "長い本文はアプリ本体から復元します。",
  choices: ["一", "二", "三", "四"],
}];
const readingSession = {
  number: 1,
  questions: [{
    ...readingData[0],
    sessionChoices: [
      { text: "一", correct: true },
      { text: "二", correct: false },
      { text: "三", correct: false },
      { text: "四", correct: false },
    ],
  }],
};
assert.equal(store.save("reading", readingSession), true);
const savedReading = store.load();
assert.equal(savedReading.session.questions[0].passage, undefined, "정적 지문을 중복 저장하면 안 됩니다.");
const hydratedReading = SessionStore.hydrateReading(savedReading.session, readingData);
assert.equal(hydratedReading.questions[0].passage, readingData[0].passage);
assert.equal(hydratedReading.questions[0].sessionChoices[0].correct, true);

assert.equal(store.clear(), true);
assert.equal(store.load(), null);
storageValues.set(SessionStore.STORAGE_KEY, "not-json");
assert.equal(store.load(), null, "손상된 저장 데이터는 안전하게 무시해야 합니다.");

console.log("support module tests passed");
