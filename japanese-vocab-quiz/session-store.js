(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.QuizSessionStore = api;
}(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const STORAGE_KEY = "jlpt-vocab-quiz-active-session-v1";
  const KINDS = ["vocab", "reading"];
  const VERSION = 1;
  const keyFor = (kind) => `jlpt-vocab-quiz-active-session-v2:${kind}`;
  const BACKUP_APP_ID = "japanese-vocab-quiz";
  const BACKUP_VERSION = 1;
  const BACKUP_MAX_BYTES = 5 * 1024 * 1024;
  const BACKUP_REVISION_KEY = "jlpt-vocab-quiz-backup-revision-v1";
  const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

  function vocabSnapshot(session) {
    if (!session || session.completed) return null;
    const {
      baseIds,
      masteredIds,
      mistakenIds,
      correctIds,
      current,
      ...plain
    } = session;
    // Sets are converted explicitly because JSON.stringify would otherwise store `{}`.
    return {
      ...plain,
      baseIds: [...baseIds],
      masteredIds: [...masteredIds],
      mistakenIds: [...mistakenIds],
      correctIds: [...correctIds],
      currentId: current?.id || null,
    };
  }

  function readingSnapshot(session) {
    if (!session || session.completed) return null;
    return {
      ...session,
      // Static passages already ship with the app. Persist only IDs and shuffled choices.
      questions: session.questions.map((item) => ({
        id: item.id,
        sessionChoices: item.sessionChoices,
      })),
    };
  }

  function hydrateVocab(snapshot) {
    return {
      ...snapshot,
      baseIds: new Set(snapshot.baseIds || []),
      queue: [...(snapshot.queue || [])],
      masteredIds: new Set(snapshot.masteredIds || []),
      mistakenIds: new Set(snapshot.mistakenIds || []),
      correctIds: new Set(snapshot.correctIds || []),
      current: null,
    };
  }

  function hydrateReading(snapshot, readingData) {
    const byId = new Map(readingData.map((item) => [item.id, item]));
    const savedQuestions = Array.isArray(snapshot.questions) ? snapshot.questions : [];
    if (!savedQuestions.length || savedQuestions.some((item) => !item || !byId.has(item.id))) return null;
    if (!Number.isInteger(snapshot.index) || snapshot.index < 0 || snapshot.index >= savedQuestions.length) return null;

    const questions = savedQuestions.map((item) => ({
      ...byId.get(item.id),
      sessionChoices: item.sessionChoices,
    }));
    // Content updates can reuse an ID. Never combine a new passage with old
    // shuffled answers: both the answer texts and the correct flag must match.
    if (questions.some((item) => !Array.isArray(item.sessionChoices)
      || item.sessionChoices.length !== 4
      || new Set(item.sessionChoices.map((choice) => choice?.text)).size !== 4
      || item.sessionChoices.some((choice) => !choice
        || !item.choices.includes(choice.text)
        || choice.correct !== (choice.text === item.choices[item.answer])))) {
      return null;
    }
    if (snapshot.hintShown && (!Number.isInteger(snapshot.hintChoiceIndex)
      || snapshot.hintChoiceIndex < 0 || snapshot.hintChoiceIndex >= 4
      || questions[snapshot.index].sessionChoices[snapshot.hintChoiceIndex].correct)) return null;
    return { ...snapshot, questions };
  }

  function create(storage, now = Date.now) {
    function read(key) {
      try {
        const saved = JSON.parse(storage.getItem(key));
        if (!saved || saved.version !== VERSION) return null;
        if (!KINDS.includes(saved.kind) || !saved.session) return null;
        return saved;
      } catch (_error) {
        return null;
      }
    }

    function migrateLegacy() {
      const saved = read(STORAGE_KEY);
      if (!saved) return;
      try {
        if (!read(keyFor(saved.kind))) storage.setItem(keyFor(saved.kind), JSON.stringify(saved));
        storage.removeItem(STORAGE_KEY);
      } catch (_error) {
        // Never remove the legacy snapshot before its replacement is durable.
      }
    }

    function load(kind = null) {
      migrateLegacy();
      const legacy = read(STORAGE_KEY);
      const byKind = (value) => {
        const saved = read(keyFor(value));
        return saved?.kind === value ? saved : legacy?.kind === value ? legacy : null;
      };
      if (kind) return KINDS.includes(kind) ? byKind(kind) : null;
      return KINDS.map(byKind).filter(Boolean).sort((a, b) => b.savedAt - a.savedAt)[0] || null;
    }

    function save(kind, session) {
      if (!KINDS.includes(kind)) return false;
      const snapshot = kind === "reading" ? readingSnapshot(session) : vocabSnapshot(session);
      if (!snapshot) return false;
      try {
        const existing = load(kind);
        if (existing?.session.runId && snapshot.runId && existing.session.runId !== snapshot.runId) return false;
        const other = read(keyFor(kind === "vocab" ? "reading" : "vocab"));
        // Preserve ordering even on browsers with a reduced clock resolution.
        const savedAt = Math.max(now(), (Number(other?.savedAt) || 0) + 1);
        storage.setItem(keyFor(kind), JSON.stringify({
          version: VERSION,
          kind,
          savedAt,
          session: snapshot,
        }));
        return true;
      } catch (_error) {
        return false;
      }
    }

    function clear(kind = null, runId = null) {
      try {
        if (kind && !KINDS.includes(kind)) return false;
        migrateLegacy();
        for (const targetedKind of kind ? [kind] : KINDS) {
          const existing = load(targetedKind);
          if (runId && existing?.session.runId && existing.session.runId !== runId) continue;
          storage.removeItem(keyFor(targetedKind));
          if (read(STORAGE_KEY)?.kind === targetedKind) storage.removeItem(STORAGE_KEY);
        }
        return true;
      } catch (_error) {
        return false;
      }
    }

    return { clear, load, save };
  }

  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const isTimestamp = (value) => Number.isSafeInteger(value) && value >= 0;
  const isId = (value) => typeof value === "string" && value.length > 0;

  function hasSafeJsonTree(value, depth = 0) {
    if (depth > 64) return false;
    if (Array.isArray(value)) return value.every((item) => hasSafeJsonTree(item, depth + 1));
    if (isObject(value)) {
      return Object.keys(value).every((key) => !PROTOTYPE_KEYS.has(key)
        && hasSafeJsonTree(value[key], depth + 1));
    }
    return typeof value !== "number" || Number.isFinite(value);
  }

  function validBackupSession(envelope, kind) {
    if (!isObject(envelope) || envelope.version !== VERSION || envelope.kind !== kind
      || !isTimestamp(envelope.savedAt) || !isObject(envelope.session)) return false;
    const session = envelope.session;
    if (kind === "vocab") {
      return ["baseIds", "queue", "masteredIds", "mistakenIds", "correctIds"].every(
        (key) => Array.isArray(session[key]) && session[key].every(isId),
      ) && (session.currentId === null || isId(session.currentId));
    }
    return Array.isArray(session.questions) && Number.isInteger(session.index)
      && session.index >= 0 && session.index < session.questions.length
      && session.questions.every((item) => isObject(item) && isId(item.id)
        && Array.isArray(item.sessionChoices) && item.sessionChoices.length === 4
        && item.sessionChoices.every((choice) => isObject(choice) && typeof choice.text === "string"
          && typeof choice.correct === "boolean"));
  }

  function createBackupStore(storage, progressKey, { validateProgress, validateSession } = {}) {
    const badFormat = () => new Error("이 앱의 백업 파일이 아니거나 기록 형식이 올바르지 않습니다.");
    const tooLarge = () => new Error("백업 파일 크기는 5MB 이하여야 합니다.");

    function serialize(value) {
      try {
        return JSON.stringify(value);
      } catch (_error) {
        throw badFormat();
      }
    }

    function parseText(text) {
      if (typeof text !== "string") throw badFormat();
      if (text.length > BACKUP_MAX_BYTES || new TextEncoder().encode(text).byteLength > BACKUP_MAX_BYTES) {
        throw tooLarge();
      }
      let parsed;
      try {
        parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
      } catch (_error) {
        throw badFormat();
      }
      if (!isObject(parsed) || parsed.app !== BACKUP_APP_ID || parsed.version !== BACKUP_VERSION
        || !isTimestamp(parsed.exportedAt) || !Number.isFinite(new Date(parsed.exportedAt).getTime()) || !isObject(parsed.sessions)
        || (parsed.progress !== null && !isObject(parsed.progress)) || !hasSafeJsonTree(parsed)
        || !KINDS.every((kind) => parsed.sessions[kind] === null || validBackupSession(parsed.sessions[kind], kind))) {
        throw badFormat();
      }
      try {
        if (parsed.progress !== null && validateProgress && !validateProgress(parsed.progress)) throw badFormat();
        if (validateSession && !KINDS.every(
          (kind) => parsed.sessions[kind] === null || validateSession(kind, parsed.sessions[kind]),
        )) throw badFormat();
      } catch (_error) {
        throw badFormat();
      }
      return parsed;
    }

    function exportText() {
      let backup;
      try {
        const read = (key) => JSON.parse(storage.getItem(key));
        const progress = read(progressKey);
        const sessions = Object.fromEntries(KINDS.map((kind) => [kind, read(keyFor(kind))]));
        // Read legacy snapshots without migrating or changing any browser data.
        if (KINDS.some((kind) => sessions[kind] === null)) {
          const legacy = read(STORAGE_KEY);
          if (legacy && KINDS.includes(legacy.kind) && sessions[legacy.kind] === null) sessions[legacy.kind] = legacy;
        }
        backup = { app: BACKUP_APP_ID, version: BACKUP_VERSION, exportedAt: Date.now(), progress, sessions };
      } catch (_error) {
        throw new Error("브라우저에서 학습 기록을 읽을 수 없습니다.");
      }
      const text = serialize(backup);
      parseText(text);
      return text;
    }

    function restore(backup) {
      const verified = parseText(serialize(backup));
      const encoded = (value) => value === null ? null : serialize(value);
      const replacement = new Map([
        [progressKey, encoded(verified.progress)],
        ...KINDS.map((kind) => [keyFor(kind), encoded(verified.sessions[kind])]),
        [STORAGE_KEY, null],
        [BACKUP_REVISION_KEY, globalThis.crypto?.randomUUID?.()
          || `${Date.now()}:${Math.random().toString(36).slice(2)}`],
      ]);
      const previous = new Map();
      try {
        for (const key of replacement.keys()) previous.set(key, storage.getItem(key));
      } catch (_error) {
        throw new Error("현재 기록을 먼저 읽을 수 없어 가져오지 않았습니다.");
      }
      const write = (key, value) => value === null ? storage.removeItem(key) : storage.setItem(key, value);
      const changeSize = (key) => (replacement.get(key)?.length || 0) - (previous.get(key)?.length || 0);
      // Release unused quota before growing other keys. A final revision change
      // tells other tabs to stop using sessions that predate the replacement.
      const keys = [...replacement.keys()].filter((key) => key !== BACKUP_REVISION_KEY
        && replacement.get(key) !== previous.get(key)).sort((a, b) => changeSize(a) - changeSize(b));
      keys.push(BACKUP_REVISION_KEY);
      const written = [];
      try {
        for (const key of keys) {
          write(key, replacement.get(key));
          written.push(key);
        }
      } catch (_error) {
        let rollbackSucceeded = true;
        for (const key of written.reverse()) {
          try {
            write(key, previous.get(key));
          } catch (_restoreError) {
            rollbackSucceeded = false;
          }
        }
        throw new Error(rollbackSucceeded
          ? "저장 공간이나 브라우저 설정 때문에 가져오지 못했습니다. 기존 기록은 유지했습니다."
          : "가져오기에 실패했고 기존 기록의 일부를 되돌리지 못했습니다. 백업 파일을 보관해 주세요.");
      }
    }

    return { exportText, parseText, restore };
  }

  function backupRevision(storage) {
    try {
      return storage.getItem(BACKUP_REVISION_KEY);
    } catch (_error) {
      return null;
    }
  }

  // Mutations are replayable: apply them to the most recent stored state, not a
  // tab's startup snapshot. Web Locks serialize read-modify-write across tabs.
  function createProgressStore(storage, key, normalize, locks = null) {
    let raw;
    let durableRevision = null;
    let durable = normalize(null);
    let committed = durable;
    const pending = [];
    let scheduled = false;
    const clone = (value) => JSON.parse(JSON.stringify(value));

    function latest() {
      try {
        const value = storage.getItem(key);
        const revision = backupRevision(storage);
        if (value !== raw || revision !== durableRevision) {
          durable = normalize(value);
          committed = durable;
          raw = value;
          durableRevision = revision;
        }
      } catch (_error) {
        // Keep a usable in-memory copy if localStorage is disabled.
      }
      return committed;
    }

    function loadPersisted() {
      latest();
      return durable;
    }

    function load() {
      const saved = latest();
      if (!pending.length) return saved;
      const optimistic = clone(saved);
      pending.forEach(({ mutate, revision }) => {
        if (revision === durableRevision) mutate(optimistic);
      });
      return optimistic;
    }

    function flush() {
      const saved = latest();
      const batch = pending.splice(0).filter(({ revision }) => revision === durableRevision);
      if (!batch.length) return;
      const next = clone(saved);
      const results = batch.map(({ mutate }) => mutate(next));
      committed = next;
      try {
        const serialized = JSON.stringify(next);
        storage.setItem(key, serialized);
        raw = serialized;
        durable = next;
      } catch (_error) {
        // Keep the in-memory result, but never clear a resumable snapshot
        // before its completion record has actually reached storage.
        return;
      }
      batch.forEach(({ onCommitted }, index) => onCommitted?.(results[index]));
    }

    function update(mutate, onCommitted) {
      pending.push({ mutate, onCommitted, revision: backupRevision(storage) });
      if (!locks?.request) {
        flush();
      } else if (!scheduled) {
        scheduled = true;
        const finish = () => {
          scheduled = false;
          flush();
        };
        try {
          locks.request(key, finish).catch(() => {
            if (scheduled) finish();
          });
        } catch (_error) {
          finish();
        }
      }
      return load();
    }

    return { load, loadPersisted, update };
  }

  return {
    BACKUP_MAX_BYTES,
    BACKUP_REVISION_KEY,
    STORAGE_KEY,
    VERSION,
    create,
    createBackupStore,
    createProgressStore,
    keyFor,
    hydrateReading,
    hydrateVocab,
    readingSnapshot,
    vocabSnapshot,
  };
}));
