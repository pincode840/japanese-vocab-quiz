"use strict";

const assert = require("node:assert/strict");
const ReadingRenderer = require("./reading-renderer.js");
const SessionStore = require("./session-store.js");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

// The deploy entry must request the exact content version of every asset.
// This catches unrebuilt HTML and prevents mixed old/new cached app files.
const readNormalized = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const shortHash = (content) => createHash("sha256").update(content).digest("hex").slice(0, 12);
const deployHtml = readNormalized(path.join(__dirname, "../index.html"));
const nestedHtml = readNormalized(path.join(__dirname, "index.html"));
const sourceHtml = nestedHtml
  .replace(/((?:src|href)="[^"/?]+\.(?:js|css))\?v=[a-f0-9]{12}"/g, '$1"')
  .replace(/(<small id="build-version">)앱 버전 [a-f0-9]{12}(<\/small>)/g, "$1개발 버전$2");
const sourceAssets = [...sourceHtml.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))"/g)].map((match) => match[1]);
assert.equal(sourceAssets.length, 16);
for (const html of [nestedHtml, deployHtml]) {
  assert.doesNotMatch(html, /<a\b[^>]*(?:feedback-source|tatoeba\.org|creativecommons\.org)/i,
    "학습 화면에는 예문 출처나 예문 라이선스 링크를 표시하지 않습니다.");
  assert.match(html, /<details id="example-attribution"[^>]*hidden>/);
}
const versions = sourceAssets.map((asset) => {
  const version = shortHash(readNormalized(path.join(__dirname, asset)));
  assert.ok(deployHtml.includes(`"japanese-vocab-quiz/${asset}?v=${version}"`), `${asset} 배포 URL에 현재 내용의 버전이 있어야 합니다.`);
  assert.ok(nestedHtml.includes(`"${asset}?v=${version}"`), `${asset} 하위 배포 URL에도 현재 버전이 있어야 합니다.`);
  return version;
});
const footer = `앱 버전 ${shortHash(sourceHtml + versions.join(""))}`;
assert.ok(deployHtml.includes(footer) && nestedHtml.includes(footer), "메인·하위 배포 버전 표시가 동일해야 합니다.");

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
  kanaAnswer: "ひらがな",
  kanaCursor: 1,
  kanaSelection: 1,
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
assert.equal(hydratedVocab.kanaAnswer, "ひらがな");
assert.equal(hydratedVocab.kanaCursor, 1);
assert.equal(hydratedVocab.kanaSelection, 1);

const readingData = [{
  id: "reading-1",
  passage: "長い本文はアプリ本体から復元します。",
  choices: ["一", "二", "三", "四"],
  answer: 0,
}];
const readingSession = {
  number: 1,
  index: 0,
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
assert.equal(SessionStore.hydrateReading(savedReading.session, [{
  ...readingData[0], choices: ["五", "六", "七", "八"],
}]), null, "업데이트 전 선택지를 새 지문과 섞어 복원하면 안 됩니다.");
assert.equal(SessionStore.hydrateReading(savedReading.session, [{
  ...readingData[0], answer: 1,
}]), null, "정답이 변경된 문제에 과거 정답 판정을 적용하면 안 됩니다.");
for (const index of [-1, 1, 0.5, undefined]) {
  assert.equal(SessionStore.hydrateReading({ ...savedReading.session, index }, readingData), null);
}
const duplicateChoices = structuredClone(savedReading.session);
duplicateChoices.questions[0].sessionChoices[1] = duplicateChoices.questions[0].sessionChoices[0];
assert.equal(SessionStore.hydrateReading(duplicateChoices, readingData), null);
assert.equal(SessionStore.hydrateReading({
  ...savedReading.session, hintShown: true, hintChoiceIndex: 8,
}, readingData), null);

assert.equal(store.clear(), true);
assert.equal(store.load(), null);
storageValues.set(SessionStore.STORAGE_KEY, "not-json");
assert.equal(store.load(), null, "손상된 저장 데이터는 안전하게 무시해야 합니다.");

// Both features keep their own active slot, including a safely migrated one.
storageValues.set(SessionStore.STORAGE_KEY, JSON.stringify(savedVocab));
assert.deepEqual(store.load("vocab"), savedVocab);
assert.equal(storageValues.has(SessionStore.STORAGE_KEY), false);
assert.ok(storageValues.has(SessionStore.keyFor("vocab")));
storageValues.set(SessionStore.keyFor("reading"), JSON.stringify(savedReading));
assert.deepEqual(store.load("reading"), savedReading);
assert.equal(store.clear("reading"), true);
assert.equal(store.load("reading"), null);
assert.deepEqual(store.load("vocab"), savedVocab);
const existingRun = { ...savedVocab, session: { ...savedVocab.session, runId: "new-run" } };
storageValues.set(SessionStore.keyFor("vocab"), JSON.stringify(existingRun));
store.clear("vocab", "old-run");
assert.deepEqual(store.load("vocab"), existingRun, "다른 탭에서 시작한 새 회차를 이전 회차 종료 시 삭제하지 않습니다.");

async function verifyProgressTransactions() {
  const key = "shared-progress-test";
  const memory = new Map();
  const sharedStorage = {
    getItem: (name) => memory.get(name) ?? null,
    setItem: (name, value) => memory.set(name, value),
  };
  const normalize = (value) => JSON.parse(value) || { basic: 0, n3: 0, mistakes: 0, history: [] };
  let locked = Promise.resolve();
  const locks = {
    request: (name, callback) => {
      assert.equal(name, key);
      locked = locked.then(callback);
      return locked;
    },
  };
  const tabA = SessionStore.createProgressStore(sharedStorage, key, normalize, locks);
  const tabB = SessionStore.createProgressStore(sharedStorage, key, normalize, locks);
  assert.deepEqual(tabA.load(), tabB.load(), "두 탭이 모두 이전 기록을 먼저 읽습니다.");
  const complete = (level) => (saved) => {
    saved[level] += 1;
    saved.mistakes += 1;
    saved.history.push(`${level}:${saved[level]}`);
    return saved[level];
  };
  assert.equal(tabA.update(complete("basic")).basic, 1);
  assert.equal(tabB.update(complete("n3")).n3, 1);
  tabA.update(complete("n3"));
  await locked;
  const saved = JSON.parse(memory.get(key));
  assert.deepEqual(saved, { basic: 1, n3: 2, mistakes: 3, history: ["basic:1", "n3:1", "n3:2"] });
  assert.deepEqual(tabB.load(), saved);
  assert.deepEqual(tabA.load(), saved);

  const blockedStorage = { ...sharedStorage, setItem() { throw new Error("quota exceeded"); } };
  const failing = SessionStore.createProgressStore(blockedStorage, key, normalize);
  let clearedSnapshot = false;
  assert.equal(failing.update(complete("basic"), () => { clearedSnapshot = true; }).basic, 2);
  assert.equal(failing.loadPersisted().basic, 1);
  assert.equal(clearedSnapshot, false, "기록 쓰기가 실패하면 재개할 수 있는 회차를 지우지 않습니다.");
}

function verifyBackupStore() {
  const progressKey = "backup-progress-test";
  const vocabKey = SessionStore.keyFor("vocab");
  const readingKey = SessionStore.keyFor("reading");
  const legacyKey = SessionStore.STORAGE_KEY;
  const memoryStorage = (entries = []) => {
    const values = new Map(entries);
    return {
      values,
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
  };
  const options = {
    validateProgress: (progress) => Array.isArray(progress.history),
    validateSession: (kind, saved) => kind === "vocab"
      ? saved.session.difficulty === "n2"
      : SessionStore.hydrateReading(saved.session, readingData) !== null,
  };
  const progress = {
    history: [{ difficulty: "n2", mode: "kanji-to-kana-meaning", correct: 10, wrong: 2 }],
    mistakeCounts: { "n2:kanji-to-kana-meaning:word-2": 1 },
    kanaPaletteMode: "all",
  };
  const source = memoryStorage([[progressKey, JSON.stringify(progress)], ["another-app", "do not export"]]);
  const active = SessionStore.create(source, () => 12345);
  assert.equal(active.save("vocab", {
    ...vocabSession,
    difficulty: "n2",
    mode: "kanji-to-kana-meaning",
    readingAnswerId: "word-1",
    masteredIds: new Set(),
    correctIds: new Set(),
    kanaPaletteMode: "all",
    kanaAnswer: "がっこう",
    kanaCursor: 4,
    kanaSelection: null,
    total: 2,
  }), true);
  assert.equal(active.save("reading", { ...readingSession, difficulty: "standard", hintShown: true, hintChoiceIndex: 1 }), true);

  const backupText = SessionStore.createBackupStore(source, progressKey, options).exportText();
  const destination = memoryStorage([
    [progressKey, JSON.stringify({ history: [] })],
    [legacyKey, source.getItem(vocabKey)],
    ["another-app", "keep my data"],
  ]);
  const importer = SessionStore.createBackupStore(destination, progressKey, options);
  const backup = importer.parseText(backupText);
  assert.deepEqual(backup.progress, progress);
  assert.deepEqual(backup.sessions.vocab, active.load("vocab"));
  assert.deepEqual(backup.sessions.reading, active.load("reading"));
  assert.ok(!backupText.includes("do not export"), "앱의 학습 기록만 내보냅니다.");
  importer.restore(backup);
  const restored = SessionStore.create(destination);
  assert.deepEqual(JSON.parse(destination.getItem(progressKey)), progress);
  assert.deepEqual(restored.load("vocab"), backup.sessions.vocab);
  assert.deepEqual(restored.load("reading"), backup.sessions.reading);
  assert.equal(destination.getItem(legacyKey), null);
  assert.equal(destination.getItem("another-app"), "keep my data");

  const originalDestination = new Map(destination.values);
  const oversizedText = JSON.stringify({ ...backup, progress: {
    ...progress,
    history: [{ ...progress.history[0], note: "한".repeat(Math.ceil(SessionStore.BACKUP_MAX_BYTES / 3)) }],
  } });
  assert.ok(oversizedText.length < SessionStore.BACKUP_MAX_BYTES && Buffer.byteLength(oversizedText, "utf8") > SessionStore.BACKUP_MAX_BYTES);
  const invalidFiles = [
    ["잘린 JSON", backupText.slice(0, -1)],
    ["알 수 없는 파일 형식", JSON.stringify({ ...backup, app: "another-app" })],
    ["미래 백업 버전", JSON.stringify({ ...backup, version: backup.version + 1 })],
    ["잘못된 기록 구조", JSON.stringify({ ...backup, progress: { history: "not an array" } })],
    ["회차 종류 불일치", JSON.stringify({ ...backup, sessions: { ...backup.sessions, vocab: backup.sessions.reading } })],
    ["유효하지 않은 회차", JSON.stringify({ ...backup, sessions: { ...backup.sessions,
      reading: { ...backup.sessions.reading, session: { ...backup.sessions.reading.session, hintChoiceIndex: 0 } },
    } })],
    ["UTF-8 용량 초과", oversizedText],
  ];
  for (const [caseName, text] of invalidFiles) {
    assert.throws(() => importer.parseText(text), Error, `${caseName} 백업은 복원할 수 없습니다.`);
    assert.deepEqual(destination.values, originalDestination, `${caseName} 백업 검증은 기존 기록을 바꾸지 않습니다.`);
  }
  assert.throws(() => importer.restore({ ...backup, version: backup.version + 1 }), Error);
  assert.deepEqual(destination.values, originalDestination, "직접 복원할 때도 검증 실패는 저장 상태를 바꾸지 않습니다.");

  const rollback = memoryStorage([
    [progressKey, JSON.stringify({ history: ["existing progress"] })],
    [vocabKey, JSON.stringify({ ...backup.sessions.vocab, savedAt: 21 })],
    [legacyKey, JSON.stringify({ ...backup.sessions.reading, savedAt: 23 })],
    ["another-app", "keep my data"],
  ]);
  const rollbackBaseline = new Map(rollback.values);
  let writeAttempt = 0;
  const quotaGuard = (method) => (key, value) => {
    if (++writeAttempt === 2) throw new Error("quota exceeded");
    return rollback[method](key, value);
  };
  const blocked = SessionStore.createBackupStore({
    ...rollback,
    setItem: quotaGuard("setItem"),
    removeItem: quotaGuard("removeItem"),
  }, progressKey, options);
  assert.throws(() => blocked.restore(backup), Error);
  assert.ok(writeAttempt >= 2, "적어도 한 저장 작업이 끝난 뒤 용량 오류를 발생시킵니다.");
  assert.deepEqual(rollback.values, rollbackBaseline, "복원 중 오류가 발생하면 변경된 키와 없는 키를 모두 원래대로 되돌립니다.");

  const legacySource = memoryStorage([
    [legacyKey, source.getItem(vocabKey)],
    [readingKey, source.getItem(readingKey)],
  ]);
  const legacyBaseline = new Map(legacySource.values);
  const legacyBackup = importer.parseText(SessionStore.createBackupStore(legacySource, progressKey, options).exportText());
  assert.equal(legacyBackup.progress, null);
  assert.deepEqual(legacyBackup.sessions, backup.sessions, "이전 공용 슬롯도 알맞은 백업 회차에 담습니다.");
  assert.deepEqual(legacySource.values, legacyBaseline, "백업 생성은 이전 저장 슬롯을 옮기거나 지우지 않습니다.");
  importer.restore(legacyBackup);
  assert.equal(destination.getItem(progressKey), null, "원본에 없는 기록은 복원 후에도 비어 있습니다.");

  // Hold an old tab's queued write until after the backup replaces progress.
  const pendingLocks = [];
  const restoredProgress = SessionStore.createProgressStore(destination, progressKey,
    (raw) => JSON.parse(raw) || { history: [] }, {
      request: (_name, callback) => new Promise((resolve) => pendingLocks.push(() => resolve(callback()))),
    });
  let oldCommitRan = false;
  restoredProgress.update((saved) => { saved.history.push("stale turn"); }, () => { oldCommitRan = true; });
  assert.equal(pendingLocks.length, 1);
  const previousRevision = destination.getItem(SessionStore.BACKUP_REVISION_KEY);
  importer.restore(backup);
  assert.notEqual(destination.getItem(SessionStore.BACKUP_REVISION_KEY), previousRevision);
  pendingLocks.shift()();
  assert.deepEqual(restoredProgress.loadPersisted(), progress, "복원 전에 대기하던 다른 탭의 학습 저장이 백업을 덮지 않습니다.");
  assert.equal(oldCommitRan, false, "취소된 이전 기록에 대한 저장 완료 콜백은 실행하지 않습니다.");
  let newCommitRan = false;
  restoredProgress.update((saved) => { saved.history.push("new turn"); }, () => { newCommitRan = true; });
  pendingLocks.shift()();
  assert.equal(newCommitRan, true);
  assert.deepEqual(restoredProgress.loadPersisted().history, [...progress.history, "new turn"]);
}

verifyProgressTransactions().then(verifyBackupStore).then(() => console.log("support module tests passed")).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
