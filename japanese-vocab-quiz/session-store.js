(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.QuizSessionStore = api;
}(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const STORAGE_KEY = "jlpt-vocab-quiz-active-session-v1";
  const VERSION = 1;

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
    if (!savedQuestions.length || savedQuestions.some((item) => !byId.has(item.id))) return null;

    const questions = savedQuestions.map((item) => ({
      ...byId.get(item.id),
      sessionChoices: item.sessionChoices,
    }));
    if (questions.some((item) => !Array.isArray(item.sessionChoices) || item.sessionChoices.length !== 4)) {
      return null;
    }
    return { ...snapshot, questions };
  }

  function create(storage, now = Date.now) {
    function load() {
      try {
        const saved = JSON.parse(storage.getItem(STORAGE_KEY));
        if (!saved || saved.version !== VERSION) return null;
        if (!["vocab", "reading"].includes(saved.kind) || !saved.session) return null;
        return saved;
      } catch (_error) {
        return null;
      }
    }

    function save(kind, session) {
      const snapshot = kind === "reading" ? readingSnapshot(session) : vocabSnapshot(session);
      if (!snapshot) return false;
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify({
          version: VERSION,
          kind,
          savedAt: now(),
          session: snapshot,
        }));
        return true;
      } catch (_error) {
        return false;
      }
    }

    function clear() {
      try {
        storage.removeItem(STORAGE_KEY);
        return true;
      } catch (_error) {
        return false;
      }
    }

    return { clear, load, save };
  }

  return {
    STORAGE_KEY,
    VERSION,
    create,
    hydrateReading,
    hydrateVocab,
    readingSnapshot,
    vocabSnapshot,
  };
}));
