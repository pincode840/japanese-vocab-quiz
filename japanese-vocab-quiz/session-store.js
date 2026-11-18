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

  // Mutations are replayable: apply them to the most recent stored state, not a
  // tab's startup snapshot. Web Locks serialize read-modify-write across tabs.
  function createProgressStore(storage, key, normalize, locks = null) {
    let raw;
    let durable = normalize(null);
    let committed = durable;
    const pending = [];
    let scheduled = false;
    const clone = (value) => JSON.parse(JSON.stringify(value));

    function latest() {
      try {
        const value = storage.getItem(key);
        if (value !== raw) {
          durable = normalize(value);
          committed = durable;
          raw = value;
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
      pending.forEach(({ mutate }) => mutate(optimistic));
      return optimistic;
    }

    function flush() {
      const batch = pending.splice(0);
      if (!batch.length) return;
      const next = clone(latest());
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
      pending.push({ mutate, onCommitted });
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
    STORAGE_KEY,
    VERSION,
    create,
    createProgressStore,
    keyFor,
    hydrateReading,
    hydrateVocab,
    readingSnapshot,
    vocabSnapshot,
  };
}));
