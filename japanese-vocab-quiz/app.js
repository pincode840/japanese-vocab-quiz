(function () {
  "use strict";

  const RETRY_DELAY = 3;
  const PRACTICE_CLEAN_STREAK_REQUIRED = 3;
  const PRACTICE_COOLDOWN_ROUNDS = 3;
  const EXAM_QUESTION_COUNT = 100;
  const WORD_TIME_LIMIT = 7;
  const KANA_TIME_LIMIT = 10;
  const SENTENCE_TIME_LIMIT = 13;
  const STORAGE_KEY = "jlpt-vocab-quiz-progress-v1";
  const engine = window.QuizEngine;

  function normalizeData(items, prefix) {
    return Array.isArray(items)
      ? items.map((item, index) => ({
        ...item,
        id: item.id || `${prefix}-${String(index + 1).padStart(3, "0")}`,
      }))
      : [];
  }

  const datasets = {
    n5n4: normalizeData(window.VOCAB_DATA, "basic"),
    n3: normalizeData(window.N3_VOCAB_DATA, "n3"),
    n2: normalizeData(window.N2_VOCAB_DATA, "n2"),
  };
  const difficultyLabels = { n5n4: "N5·N4", n3: "N3", n2: "N2" };
  const modeLabels = {
    "kanji-to-reading": "한자→읽기",
    "kanji-to-kana": "한자→히라가나 조합",
    "reading-to-kanji": "읽기→한자",
    "sentence-to-kanji": "문장 빈칸→한자",
  };
  const HIRAGANA_POOL = [...new Set(
    "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん"
    + "がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉゃゅょっゔー",
  )];

  const screens = {
    start: document.getElementById("start-screen"),
    quiz: document.getElementById("quiz-screen"),
    result: document.getElementById("result-screen"),
  };

  const elements = {
    homeButton: document.getElementById("home-button"),
    startSelectionLabel: document.getElementById("start-selection-label"),
    nextSessionNumber: document.getElementById("next-session-number"),
    modeRecordsTitle: document.getElementById("mode-records-title"),
    recordKanjiReading: document.getElementById("record-kanji-reading"),
    kanjiReadingSessions: document.getElementById("kanji-reading-sessions"),
    kanjiReadingLastAccuracy: document.getElementById("kanji-reading-last-accuracy"),
    kanjiReadingTotalAccuracy: document.getElementById("kanji-reading-total-accuracy"),
    recordKanjiKana: document.getElementById("record-kanji-kana"),
    kanjiKanaSessions: document.getElementById("kanji-kana-sessions"),
    kanjiKanaLastAccuracy: document.getElementById("kanji-kana-last-accuracy"),
    kanjiKanaTotalAccuracy: document.getElementById("kanji-kana-total-accuracy"),
    recordReadingKanji: document.getElementById("record-reading-kanji"),
    readingKanjiSessions: document.getElementById("reading-kanji-sessions"),
    readingKanjiLastAccuracy: document.getElementById("reading-kanji-last-accuracy"),
    readingKanjiTotalAccuracy: document.getElementById("reading-kanji-total-accuracy"),
    recordSentenceKanji: document.getElementById("record-sentence-kanji"),
    sentenceKanjiSessions: document.getElementById("sentence-kanji-sessions"),
    sentenceKanjiLastAccuracy: document.getElementById("sentence-kanji-last-accuracy"),
    sentenceKanjiTotalAccuracy: document.getElementById("sentence-kanji-total-accuracy"),
    historyPanel: document.getElementById("history-panel"),
    historyList: document.getElementById("history-list"),
    difficultyBasic: document.getElementById("difficulty-basic"),
    difficultyN3: document.getElementById("difficulty-n3"),
    difficultyN2: document.getElementById("difficulty-n2"),
    modeKanjiReading: document.getElementById("mode-kanji-reading"),
    modeKanjiKana: document.getElementById("mode-kanji-kana"),
    modeReadingKanji: document.getElementById("mode-reading-kanji"),
    modeSentenceKanji: document.getElementById("mode-sentence-kanji"),
    examMode: document.getElementById("exam-mode"),
    examModeState: document.getElementById("exam-mode-state"),
    examModeNote: document.getElementById("exam-mode-note"),
    choiceCount4: document.getElementById("choice-count-4"),
    choiceCount6: document.getElementById("choice-count-6"),
    choiceCount8: document.getElementById("choice-count-8"),
    choiceCountPicker: document.getElementById("choice-count-picker"),
    generalQuestionCountPanel: document.getElementById("general-question-count-panel"),
    generalQuestionCount: document.getElementById("general-question-count"),
    generalQuestionCountHint: document.getElementById("general-question-count-hint"),
    questionCountPanel: document.getElementById("question-count-panel"),
    sentenceQuestionCount: document.getElementById("sentence-question-count"),
    sentenceQuestionCountHint: document.getElementById("sentence-question-count-hint"),
    startButton: document.getElementById("start-button"),
    quizSessionLabel: document.getElementById("quiz-session-label"),
    quizProgressText: document.getElementById("quiz-progress-text"),
    liveAccuracy: document.getElementById("live-accuracy"),
    examTimer: document.getElementById("exam-timer"),
    examTimeLeft: document.getElementById("exam-time-left"),
    progressBar: document.getElementById("progress-bar"),
    quizPrompt: document.getElementById("quiz-prompt"),
    quizWord: document.getElementById("quiz-word"),
    dayLabel: document.getElementById("day-label"),
    examMistakeBadge: document.getElementById("exam-mistake-badge"),
    answerGrid: document.getElementById("answer-grid"),
    kanaComposer: document.getElementById("kana-composer"),
    kanaAnswer: document.getElementById("kana-answer"),
    kanaGrid: document.getElementById("kana-grid"),
    kanaBackspace: document.getElementById("kana-backspace"),
    kanaClear: document.getElementById("kana-clear"),
    kanaSubmit: document.getElementById("kana-submit"),
    feedback: document.getElementById("feedback"),
    feedbackIcon: document.getElementById("feedback-icon"),
    feedbackTitle: document.getElementById("feedback-title"),
    feedbackSelected: document.getElementById("feedback-selected"),
    feedbackReading: document.getElementById("feedback-reading"),
    feedbackMeaning: document.getElementById("feedback-meaning"),
    feedbackTranslation: document.getElementById("feedback-translation"),
    feedbackSource: document.getElementById("feedback-source"),
    retryNote: document.getElementById("retry-note"),
    nextButton: document.getElementById("next-button"),
    resultSessionNumber: document.getElementById("result-session-number"),
    resultMessage: document.getElementById("result-message"),
    resultAccuracy: document.getElementById("result-accuracy"),
    resultCorrect: document.getElementById("result-correct"),
    resultWrong: document.getElementById("result-wrong"),
    resultMastered: document.getElementById("result-mastered"),
    returnButton: document.getElementById("return-button"),
    keyboardHint: document.getElementById("keyboard-hint"),
    appError: document.getElementById("app-error"),
  };

  const modeRecordElements = {
    "kanji-to-reading": {
      card: elements.recordKanjiReading,
      sessions: elements.kanjiReadingSessions,
      lastAccuracy: elements.kanjiReadingLastAccuracy,
      totalAccuracy: elements.kanjiReadingTotalAccuracy,
    },
    "kanji-to-kana": {
      card: elements.recordKanjiKana,
      sessions: elements.kanjiKanaSessions,
      lastAccuracy: elements.kanjiKanaLastAccuracy,
      totalAccuracy: elements.kanjiKanaTotalAccuracy,
    },
    "reading-to-kanji": {
      card: elements.recordReadingKanji,
      sessions: elements.readingKanjiSessions,
      lastAccuracy: elements.readingKanjiLastAccuracy,
      totalAccuracy: elements.readingKanjiTotalAccuracy,
    },
    "sentence-to-kanji": {
      card: elements.recordSentenceKanji,
      sessions: elements.sentenceKanjiSessions,
      lastAccuracy: elements.sentenceKanjiLastAccuracy,
      totalAccuracy: elements.sentenceKanjiTotalAccuracy,
    },
  };

  let progress = loadProgress();
  let session = null;
  let examTimerId = null;

  function hasCompleteSentence(item) {
    return item.sentence?.split("___").length === 2
      && item.sentenceFurigana?.split("___").length === 2
      && item.sentenceTranslation;
  }

  function kanaReadings(reading) {
    return engine.kanaReadings(reading);
  }

  function requiredKanaCharacters(reading) {
    return [...new Set(kanaReadings(reading).flatMap((candidate) => [...candidate]))];
  }

  function hasKanaReading(item) {
    const readings = kanaReadings(item.reading);
    return readings.length > 0 && requiredKanaCharacters(item.reading).length <= 9;
  }

  function datasetForMode(difficulty, mode) {
    const quizData = datasets[difficulty] || [];
    if (mode === "sentence-to-kanji") return quizData.filter(hasCompleteSentence);
    const generalData = difficulty === "n3"
      ? quizData.filter((item) => /[一-龯々〆ヵヶ]/.test(item.word))
      : quizData;
    return mode === "kanji-to-kana" ? generalData.filter(hasKanaReading) : generalData;
  }

  function selectedDifficulty() {
    if (elements.difficultyN3.checked) return "n3";
    if (elements.difficultyN2.checked) return "n2";
    return "n5n4";
  }

  function selectedMode() {
    if (elements.modeSentenceKanji.checked) return "sentence-to-kanji";
    if (elements.modeKanjiKana.checked) return "kanji-to-kana";
    if (elements.modeReadingKanji.checked) return "reading-to-kanji";
    return "kanji-to-reading";
  }

  function selectedChoiceCount() {
    if (elements.choiceCount8.checked) return 8;
    if (elements.choiceCount6.checked) return 6;
    return 4;
  }

  function emptySessionStat() {
    return {
      completedSessions: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      lastAccuracy: null,
    };
  }

  function sessionScopeKey(difficulty, mode) {
    return `${difficulty}:${mode}`;
  }

  function defaultSessionStats() {
    const result = {};
    Object.keys(difficultyLabels).forEach((difficulty) => {
      Object.keys(modeLabels).forEach((mode) => {
        result[sessionScopeKey(difficulty, mode)] = emptySessionStat();
      });
    });
    return result;
  }

  function normalizeSessionStats(savedStats, history, savedProgress) {
    const result = defaultSessionStats();
    if (savedStats && typeof savedStats === "object" && Object.keys(savedStats).length > 0) {
      Object.keys(result).forEach((key) => {
        const saved = savedStats[key];
        if (!saved || typeof saved !== "object") return;
        result[key] = { ...emptySessionStat(), ...saved };
      });
      return result;
    }

    (Array.isArray(history) ? history : []).forEach((entry) => {
      const difficulty = difficultyLabels[entry.difficulty] ? entry.difficulty : "n5n4";
      const mode = modeLabels[entry.mode] ? entry.mode : "kanji-to-reading";
      const stat = result[sessionScopeKey(difficulty, mode)];
      const correct = Number(entry.correct) || 0;
      const wrong = Number(entry.wrong) || 0;
      stat.completedSessions += 1;
      stat.totalCorrect += correct;
      stat.totalAttempts += correct + wrong;
      stat.lastAccuracy = Number.isFinite(Number(entry.accuracy)) ? Number(entry.accuracy) : null;
    });

    if (!(history || []).length && Number(savedProgress?.completedSessions) > 0) {
      result[sessionScopeKey("n5n4", "kanji-to-reading")] = {
        completedSessions: Number(savedProgress.completedSessions) || 0,
        totalCorrect: Number(savedProgress.totalCorrect) || 0,
        totalAttempts: Number(savedProgress.totalAttempts) || 0,
        lastAccuracy: Number.isFinite(Number(savedProgress.lastAccuracy))
          ? Number(savedProgress.lastAccuracy)
          : null,
      };
    }
    return result;
  }

  function defaultProgress() {
    return {
      completedSessions: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      lastAccuracy: null,
      history: [],
      mistakeCounts: {},
      practiceSessionCount: 0,
      practiceCleanStreaks: {},
      practiceCooldowns: {},
      examMistakeCounts: {},
      examCooldowns: {},
      seenIds: [],
      sessionStats: defaultSessionStats(),
    };
  }

  function mistakeCountMappings() {
    const mappings = [];
    Object.keys(difficultyLabels).forEach((difficulty) => {
      Object.keys(modeLabels).forEach((mode) => {
        datasets[difficulty].forEach((item) => {
          const legacyKeys = [`${mode}:${item.id}`];
          if (difficulty === "n5n4" && mode === "kanji-to-reading") {
            legacyKeys.push(item.id);
          }
          mappings.push({
            scopedKey: itemProgressKey(difficulty, mode, item.id),
            legacyKeys,
          });
        });
      });
    });
    return mappings;
  }

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") return defaultProgress();
      const normalized = { ...defaultProgress(), ...saved };
      normalized.sessionStats = normalizeSessionStats(saved.sessionStats, normalized.history, saved);
      normalized.mistakeCounts = engine.migrateScopedCounts(
        saved.mistakeCounts,
        mistakeCountMappings(),
      );
      normalized.practiceSessionCount = Math.max(0, Number(saved.practiceSessionCount) || 0);
      normalized.practiceCleanStreaks = saved.practiceCleanStreaks
        && typeof saved.practiceCleanStreaks === "object"
        ? saved.practiceCleanStreaks
        : {};
      normalized.practiceCooldowns = saved.practiceCooldowns
        && typeof saved.practiceCooldowns === "object"
        ? saved.practiceCooldowns
        : {};
      normalized.examMistakeCounts = saved.examMistakeCounts && typeof saved.examMistakeCounts === "object"
        ? saved.examMistakeCounts
        : {};
      normalized.examCooldowns = saved.examCooldowns && typeof saved.examCooldowns === "object"
        ? saved.examCooldowns
        : {};
      return normalized;
    } catch (_error) {
      return defaultProgress();
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (_error) {
      // The quiz remains usable if storage is unavailable.
    }
  }

  function formatAccuracy(value) {
    return value === null ? "—" : `${value}%`;
  }

  function statsFor(difficulty, mode) {
    const key = sessionScopeKey(difficulty, mode);
    progress.sessionStats[key] ||= emptySessionStat();
    return progress.sessionStats[key];
  }

  function itemProgressKey(difficulty, mode, itemId) {
    return `${difficulty}:${mode}:${itemId}`;
  }

  function examEligibleItems(difficulty, mode, sessionNumber) {
    return datasetForMode(difficulty, mode).filter((item) => {
      const eligibleFrom = Number(progress.examCooldowns[itemProgressKey(difficulty, mode, item.id)]) || 0;
      return sessionNumber >= eligibleFrom;
    });
  }

  function isPracticeWordMode(mode) {
    return mode !== "sentence-to-kanji";
  }

  function practiceEligibleItems(difficulty, mode, practiceRound) {
    return datasetForMode(difficulty, mode).filter((item) => engine.isReviewEligible(
      progress.practiceCooldowns,
      itemProgressKey(difficulty, mode, item.id),
      practiceRound,
    ));
  }

  function updatePracticeReviewProgress() {
    if (session.examMode || !isPracticeWordMode(session.mode)) return 0;

    const itemKeys = [...session.baseIds].map((itemId) => itemProgressKey(
      session.difficulty,
      session.mode,
      itemId,
    ));
    const mistakenKeys = [...session.mistakenIds].map((itemId) => itemProgressKey(
      session.difficulty,
      session.mode,
      itemId,
    ));
    const protectedKeys = engine.updateCleanReview(
      progress.practiceCleanStreaks,
      progress.practiceCooldowns,
      itemKeys,
      mistakenKeys,
      session.practiceRound,
      PRACTICE_CLEAN_STREAK_REQUIRED,
      PRACTICE_COOLDOWN_ROUNDS,
    );
    progress.practiceSessionCount = session.practiceRound;
    return protectedKeys.length;
  }

  function stopExamTimer() {
    if (examTimerId !== null) {
      clearInterval(examTimerId);
      examTimerId = null;
    }
    if (session) session.examDeadline = null;
    elements.examTimer.classList.remove("is-urgent");
  }

  function renderExamTime() {
    elements.examTimeLeft.textContent = session?.timeRemaining ?? "—";
    elements.examTimer.classList.toggle("is-urgent", Boolean(session && session.timeRemaining <= 3));
  }

  function examTimeLimit(mode) {
    if (mode === "sentence-to-kanji") return SENTENCE_TIME_LIMIT;
    if (mode === "kanji-to-kana") return KANA_TIME_LIMIT;
    return WORD_TIME_LIMIT;
  }

  function startExamTimer() {
    stopExamTimer();
    if (!session?.examMode) {
      elements.examTimer.hidden = true;
      return;
    }
    session.timeRemaining = examTimeLimit(session.mode);
    session.examDeadline = Date.now() + session.timeRemaining * 1000;
    elements.examTimer.hidden = false;
    renderExamTime();
    examTimerId = setInterval(() => {
      if (!session || session.answered) {
        stopExamTimer();
        return;
      }
      const remainingMilliseconds = session.examDeadline - Date.now();
      session.timeRemaining = Math.max(0, Math.ceil(remainingMilliseconds / 1000));
      renderExamTime();
      if (remainingMilliseconds <= 0) {
        stopExamTimer();
        answerQuestion(null, true);
      }
    }, 250);
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, screen]) => {
      screen.classList.toggle("is-active", key === name);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderStartScreen() {
    const difficulty = selectedDifficulty();
    const selectedLearningMode = selectedMode();
    const selectedStat = statsFor(difficulty, selectedLearningMode);
    elements.startSelectionLabel.textContent = `${difficultyLabels[difficulty]} · ${modeLabels[selectedLearningMode]}`;
    elements.nextSessionNumber.textContent = selectedStat.completedSessions + 1;
    elements.modeRecordsTitle.textContent = `${difficultyLabels[difficulty]} 학습 모드별 기록`;

    Object.entries(modeRecordElements).forEach(([mode, recordElements]) => {
      const stat = statsFor(difficulty, mode);
      const cumulative = engine.accuracy(stat.totalCorrect, stat.totalAttempts);
      recordElements.sessions.textContent = `${stat.completedSessions}회`;
      recordElements.lastAccuracy.textContent = formatAccuracy(stat.lastAccuracy);
      recordElements.totalAccuracy.textContent = formatAccuracy(cumulative);
      recordElements.card.classList.toggle("is-selected", mode === selectedLearningMode);
    });

    const recent = progress.history.slice(-5).reverse();
    elements.historyPanel.hidden = recent.length === 0;
    elements.historyList.replaceChildren();
    recent.forEach((entry) => {
      const row = document.createElement("li");
      const label = document.createElement("strong");
      const score = document.createElement("span");
      const date = document.createElement("span");
      const historyMode = modeLabels[entry.mode] || modeLabels["kanji-to-reading"];
      const historyDifficulty = difficultyLabels[entry.difficulty] || difficultyLabels.n5n4;
      const examLabel = entry.examMode ? " · 시험" : "";
      const choiceLabel = entry.mode === "kanji-to-kana"
        ? "히라가나 9개"
        : `${entry.choiceCount || 4}지선다`;
      label.textContent = `${entry.session}회차 · ${historyDifficulty} · ${historyMode}${examLabel} · ${choiceLabel}`;
      score.textContent = `정답률 ${entry.accuracy}%`;
      date.className = "history-date";
      date.textContent = entry.date;
      row.append(label, score, date);
      elements.historyList.append(row);
    });
  }

  function selectSessionItems(mode, difficulty, sessionSize, sourceItems = null) {
    const quizData = sourceItems || datasetForMode(difficulty, mode);
    const scopedMistakes = {};
    quizData.forEach((item) => {
      scopedMistakes[item.id] = progress.mistakeCounts[itemProgressKey(difficulty, mode, item.id)] || 0;
    });
    return engine.selectSessionItems(
      quizData,
      { mistakeCounts: scopedMistakes, seenIds: progress.seenIds },
      sessionSize,
    );
  }

  function startSession() {
    const mode = selectedMode();
    const difficulty = selectedDifficulty();
    const choiceCount = mode === "kanji-to-kana" ? 9 : selectedChoiceCount();
    const examMode = elements.examMode.checked;
    const maximumSize = datasetForMode(difficulty, mode).length;
    const sessionStat = statsFor(difficulty, mode);
    const sessionNumber = sessionStat.completedSessions + 1;
    const practiceRound = (Number(progress.practiceSessionCount) || 0) + 1;
    const practiceWordMode = !examMode && isPracticeWordMode(mode);
    const eligibleItems = examMode
      ? examEligibleItems(difficulty, mode, sessionNumber)
      : practiceWordMode
        ? practiceEligibleItems(difficulty, mode, practiceRound)
        : null;
    if (examMode && eligibleItems.length < EXAM_QUESTION_COUNT) {
      syncModeControls();
      return;
    }
    if (practiceWordMode && eligibleItems.length === 0) {
      syncModeControls();
      return;
    }
    const countInput = mode === "sentence-to-kanji"
      ? elements.sentenceQuestionCount
      : elements.generalQuestionCount;
    const requestedSize = examMode
      ? EXAM_QUESTION_COUNT
      : Math.min(maximumSize, Math.max(10, Math.round(Number(countInput.value) || maximumSize)));
    const items = selectSessionItems(mode, difficulty, requestedSize, eligibleItems);
    session = {
      number: sessionNumber,
      difficulty,
      mode,
      examMode,
      practiceRound,
      choiceCount,
      total: items.length,
      baseIds: new Set(items.map((item) => item.id)),
      queue: items.map((item) => item.id),
      masteredIds: new Set(),
      mistakenIds: new Set(),
      correct: 0,
      wrong: 0,
      attempts: 0,
      completedQuestions: 0,
      correctIds: new Set(),
      kanaAnswer: "",
      current: null,
      currentMisses: 0,
      answered: false,
    };

    const modeLabel = modeLabels[mode];
    const examLabel = examMode ? " · 시험 모드" : "";
    const choiceLabel = mode === "kanji-to-kana" ? "히라가나 9개" : `${choiceCount}지선다`;
    elements.quizSessionLabel.textContent = `${session.number}회차 · ${difficultyLabels[difficulty]} · ${modeLabel}${examLabel} · ${choiceLabel}`;
    elements.keyboardHint.textContent = mode === "kanji-to-kana"
      ? examMode
        ? "숫자키 1–9로 히라가나 선택 · Backspace로 지우기 · 제한시간 안에 Enter로 제출"
        : "숫자키 1–9로 히라가나 선택 · Backspace로 지우기 · Enter로 제출"
      : examMode
        ? `숫자키 1–${choiceCount} 또는 숫자패드로 선택 · 제한시간 안에 답하세요`
        : `숫자키 1–${choiceCount} 또는 숫자패드로 선택 · Enter로 다음`;
    showScreen("quiz");
    showNextQuestion();
  }

  function findItem(id) {
    return datasetForMode(session.difficulty, session.mode).find((item) => item.id === id);
  }

  function normalizedReading(reading) {
    return engine.normalizedReading(reading);
  }

  function buildChoices(correctItem) {
    const quizData = datasetForMode(session.difficulty, session.mode);
    return session.mode === "reading-to-kanji" || session.mode === "sentence-to-kanji"
      ? engine.buildChoicesByWord(quizData, correctItem, session.choiceCount)
      : engine.buildChoices(quizData, correctItem, session.choiceCount);
  }

  function buildKanaTiles(item) {
    const required = requiredKanaCharacters(item.reading);
    const distractors = engine.shuffle(
      HIRAGANA_POOL.filter((character) => !required.includes(character)),
    ).slice(0, 9 - required.length);
    return engine.shuffle([...required, ...distractors]);
  }

  function renderKanaAnswer() {
    const answer = session?.kanaAnswer || "";
    elements.kanaAnswer.textContent = answer || "히라가나를 선택하세요";
    elements.kanaAnswer.classList.toggle("is-empty", !answer);
    const unavailable = !session || session.answered;
    elements.kanaBackspace.disabled = unavailable || !answer;
    elements.kanaClear.disabled = unavailable || !answer;
    elements.kanaSubmit.disabled = unavailable || !answer;
  }

  function appendKana(character) {
    if (!session || session.answered || session.mode !== "kanji-to-kana") return;
    if (session.kanaAnswer.length >= 20) return;
    session.kanaAnswer += character;
    renderKanaAnswer();
  }

  function removeLastKana() {
    if (!session || session.answered || session.mode !== "kanji-to-kana") return;
    session.kanaAnswer = session.kanaAnswer.slice(0, -1);
    renderKanaAnswer();
  }

  function clearKanaAnswer() {
    if (!session || session.answered || session.mode !== "kanji-to-kana") return;
    session.kanaAnswer = "";
    renderKanaAnswer();
  }

  function submitKanaAnswer() {
    if (!session || session.answered || session.mode !== "kanji-to-kana" || !session.kanaAnswer) return;
    answerQuestion(null, false, session.kanaAnswer);
  }

  function showNextQuestion() {
    stopExamTimer();
    if (session.queue.length === 0) {
      completeSession();
      return;
    }

    session.current = findItem(session.queue.shift());
    session.currentMisses = 0;
    session.answered = false;
    session.kanaAnswer = "";
    const item = session.current;
    const isKanjiToKana = session.mode === "kanji-to-kana";
    const choices = isKanjiToKana ? [] : buildChoices(item);
    const isReadingToKanji = session.mode === "reading-to-kanji";
    const isSentenceToKanji = session.mode === "sentence-to-kanji";

    elements.quizPrompt.textContent = isKanjiToKana
      ? "히라가나를 순서대로 눌러 한자의 읽기를 완성하세요."
      : isSentenceToKanji
      ? "문장의 빈칸에 알맞은 한자 단어는 무엇일까요?"
      : isReadingToKanji
        ? "이 읽기에 알맞은 단어는 무엇일까요?"
        : "이 단어를 어떻게 읽을까요?";
    elements.quizWord.textContent = isSentenceToKanji
      ? item.sentence.replace("___", "＿＿＿")
      : isReadingToKanji
        ? normalizedReading(item.reading)
        : item.word;
    elements.quizWord.setAttribute("aria-label", elements.quizWord.textContent);
    elements.quizWord.classList.toggle("is-reading", isReadingToKanji);
    elements.quizWord.classList.toggle("is-sentence", isSentenceToKanji);
    if (session.difficulty === "n5n4") {
      elements.dayLabel.textContent = isSentenceToKanji
        ? `${item.day}일차 · 문장 빈칸`
        : `${item.day}일차`;
    } else {
      const source = isSentenceToKanji ? item.sentenceSource || item.source : item.source;
      const sentenceLabel = isSentenceToKanji ? " · 문장 빈칸" : "";
      elements.dayLabel.textContent = `${difficultyLabels[session.difficulty]}${sentenceLabel} · ${source}`;
    }
    const examMistakeKey = itemProgressKey(session.difficulty, session.mode, item.id);
    const examMistakeCount = Number(progress.examMistakeCounts[examMistakeKey]) || 0;
    elements.examMistakeBadge.hidden = !(session.examMode && examMistakeCount > 0);
    elements.examMistakeBadge.textContent = examMistakeCount > 0
      ? `⚠ 이 문제는 시험에서 ${examMistakeCount}회 틀렸습니다`
      : "";
    elements.answerGrid.replaceChildren();
    elements.answerGrid.hidden = isKanjiToKana;
    elements.kanaComposer.hidden = !isKanjiToKana;
    choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-button";
      button.dataset.itemId = choice.id;
      const answerText = isReadingToKanji || isSentenceToKanji
        ? choice.word
        : normalizedReading(choice.reading);
      button.setAttribute("aria-label", `${index + 1}번, ${answerText}`);
      const number = document.createElement("span");
      number.className = "answer-number";
      number.textContent = index + 1;
      const reading = document.createElement("span");
      reading.lang = "ja";
      reading.textContent = answerText;
      button.append(number, reading);
      button.addEventListener("click", () => answerQuestion(choice.id));
      elements.answerGrid.append(button);
    });
    elements.kanaGrid.replaceChildren();
    if (isKanjiToKana) {
      buildKanaTiles(item).forEach((character, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "kana-tile";
        button.dataset.kana = character;
        button.setAttribute("aria-label", `${index + 1}번, ${character}`);
        const number = document.createElement("span");
        number.className = "answer-number";
        number.textContent = index + 1;
        const kana = document.createElement("span");
        kana.lang = "ja";
        kana.textContent = character;
        button.append(number, kana);
        button.addEventListener("click", () => appendKana(character));
        elements.kanaGrid.append(button);
      });
      renderKanaAnswer();
    }

    elements.feedback.hidden = true;
    elements.feedback.className = "feedback";
    elements.feedbackSelected.hidden = true;
    elements.feedbackSelected.textContent = "";
    elements.feedbackTranslation.hidden = true;
    elements.feedbackTranslation.textContent = "";
    elements.feedbackSource.hidden = !item.sentenceAttribution;
    elements.feedbackSource.href = item.sentenceAttribution || "";
    elements.feedbackSource.textContent = item.sentenceAttribution
      ? `예문 출처 · Tatoeba (${item.sentenceLicense || "CC BY 2.0 FR"})`
      : "";
    elements.retryNote.hidden = true;
    elements.nextButton.hidden = true;
    updateSessionHeader();
    const firstInput = isKanjiToKana
      ? elements.kanaGrid.querySelector("button")
      : elements.answerGrid.querySelector("button");
    firstInput?.focus();
    startExamTimer();
  }

  function answerQuestion(selectedId, timedOut = false, constructedAnswer = null) {
    if (session.answered) return;
    if (session.examMode) stopExamTimer();
    session.attempts += 1;
    const isKanjiToKana = session.mode === "kanji-to-kana";
    const correctKanaAnswers = isKanjiToKana ? kanaReadings(session.current.reading) : [];
    const isCorrect = !timedOut && (
      isKanjiToKana ? correctKanaAnswers.includes(constructedAnswer) : selectedId === session.current.id
    );
    const isSentenceToKanji = session.mode === "sentence-to-kanji";
    const selectedItem = timedOut || isKanjiToKana ? null : findItem(selectedId);
    const selectedReading = selectedItem ? normalizedReading(selectedItem.reading) : "";
    const selectedAnswer = timedOut
      ? "시간 초과"
      : isKanjiToKana
        ? constructedAnswer
      : session.mode === "kanji-to-reading"
        ? `${selectedReading} · ${selectedItem.word} · ${selectedItem.meaning}`
        : `${selectedItem.word}（${selectedReading}） · ${selectedItem.meaning}`;
    const buttons = [...elements.answerGrid.querySelectorAll("button")];
    const selectedButton = buttons.find((button) => button.dataset.itemId === selectedId);
    const key = itemProgressKey(session.difficulty, session.mode, session.current.id);

    if (!session.examMode && isSentenceToKanji && !isCorrect && session.currentMisses === 0) {
      session.currentMisses = 1;
      session.wrong += 1;
      progress.mistakeCounts[key] = (progress.mistakeCounts[key] || 0) + 1;
      selectedButton.disabled = true;
      selectedButton.classList.add("is-wrong");

      elements.quizWord.innerHTML = session.current.sentenceFurigana.replace(
        "___",
        '<span class="sentence-blank" aria-hidden="true">＿＿＿</span>',
      );
      elements.feedback.hidden = false;
      elements.feedback.className = "feedback";
      elements.feedback.classList.add("is-wrong");
      elements.feedbackIcon.innerHTML = "<span>!</span>";
      elements.feedbackTitle.textContent = "한 번 더 생각해 보세요";
      elements.feedbackSelected.hidden = false;
      elements.feedbackSelected.textContent = `선택한 답  ${selectedAnswer}`;
      elements.feedbackReading.textContent = "힌트  문장에 후리가나를 표시했어요.";
      elements.feedbackMeaning.textContent = "후리가나를 참고해서 다시 선택하세요.";
      elements.feedbackTranslation.hidden = true;
      elements.retryNote.hidden = true;
      elements.nextButton.hidden = true;
      updateSessionHeader();
      buttons.find((button) => !button.disabled)?.focus();
      return;
    }

    session.answered = true;
    if (isSentenceToKanji && !isCorrect) session.currentMisses += 1;
    buttons.forEach((button) => {
      button.disabled = true;
      if (button.dataset.itemId === session.current.id) button.classList.add("is-correct");
      if (!isCorrect && selectedId && button.dataset.itemId === selectedId) button.classList.add("is-wrong");
    });
    if (isKanjiToKana) {
      [...elements.kanaGrid.querySelectorAll("button")].forEach((button) => {
        button.disabled = true;
      });
      renderKanaAnswer();
    }

    elements.feedback.hidden = false;
    elements.feedback.className = "feedback";
    elements.feedback.classList.add(isCorrect ? "is-correct" : "is-wrong");
    elements.feedbackIcon.innerHTML = `<span>${isCorrect ? "✓" : "!"}</span>`;
    elements.feedbackTitle.textContent = isCorrect
      ? "정답이에요"
      : timedOut
        ? "시간이 초과됐어요. 정답을 확인하세요"
      : isSentenceToKanji
        ? session.examMode
          ? "오답이에요. 정답과 해석을 확인하세요"
          : "두 번 틀렸어요. 정답과 해석을 확인하세요"
        : "아쉬워요, 정답을 확인하세요";
    elements.feedbackSelected.hidden = isCorrect;
    elements.feedbackSelected.textContent = isCorrect ? "" : `선택한 답  ${selectedAnswer}`;
    elements.feedbackReading.textContent = session.mode === "sentence-to-kanji"
      ? `정답  ${session.current.word}（${normalizedReading(session.current.reading)}）`
      : isKanjiToKana
        ? `정답 읽기  ${correctKanaAnswers.join(" / ")}`
      : session.mode === "reading-to-kanji"
        ? `정답  ${session.current.word}`
        : `읽기  ${normalizedReading(session.current.reading)}`;
    elements.feedbackMeaning.textContent = `뜻  ${session.current.meaning}`;
    elements.feedbackTranslation.hidden = !(isSentenceToKanji && !isCorrect);
    elements.feedbackTranslation.textContent = isSentenceToKanji && !isCorrect
      ? `문장 해석  ${session.current.sentenceTranslation}`
      : "";

    if (isCorrect) {
      session.correct += 1;
      session.masteredIds.add(session.current.id);
      if (session.examMode) session.correctIds.add(session.current.id);
      if (progress.mistakeCounts[key]) {
        progress.mistakeCounts[key] = Math.max(0, progress.mistakeCounts[key] - 1);
      }
    } else {
      session.wrong += 1;
      session.masteredIds.delete(session.current.id);
      if (!session.examMode && !isSentenceToKanji) {
        session.mistakenIds.add(session.current.id);
      }
      progress.mistakeCounts[key] = (progress.mistakeCounts[key] || 0) + 1;
      if (session.examMode) {
        progress.examMistakeCounts[key] = (progress.examMistakeCounts[key] || 0) + 1;
        const examMistakeCount = progress.examMistakeCounts[key];
        elements.examMistakeBadge.hidden = false;
        elements.examMistakeBadge.textContent = `⚠ 이 문제는 시험에서 ${examMistakeCount}회 틀렸습니다`;
        elements.retryNote.textContent = `시험 누적 오답 ${examMistakeCount}회가 기록되었습니다.`;
        saveProgress();
      } else {
        engine.insertRetry(session.queue, session.current.id, RETRY_DELAY);
        elements.retryNote.textContent = isSentenceToKanji
          ? "이 문장은 잠시 뒤 다시 나옵니다."
          : "이 단어는 잠시 뒤 다시 나옵니다.";
      }
      elements.retryNote.hidden = false;
    }

    if (session.examMode) session.completedQuestions += 1;

    elements.nextButton.textContent = session.queue.length
      ? session.mode === "sentence-to-kanji" ? "다음 문제" : "다음 단어"
      : "결과 보기";
    elements.nextButton.hidden = false;
    updateSessionHeader();
    elements.nextButton.focus();
  }

  function updateSessionHeader() {
    const completed = session.examMode ? session.completedQuestions : session.masteredIds.size;
    const currentPosition = Math.min(completed + 1, session.total);
    elements.quizProgressText.textContent = `${currentPosition} / ${session.total}`;
    elements.liveAccuracy.textContent = formatAccuracy(engine.accuracy(session.correct, session.attempts));
    elements.progressBar.style.width = `${(completed / session.total) * 100}%`;
  }

  function completeSession() {
    stopExamTimer();
    elements.examTimer.hidden = true;
    const sessionAccuracy = engine.accuracy(session.correct, session.attempts) || 0;
    const newlyProtectedCount = updatePracticeReviewProgress();
    const sessionStat = statsFor(session.difficulty, session.mode);
    sessionStat.completedSessions += 1;
    sessionStat.totalCorrect += session.correct;
    sessionStat.totalAttempts += session.attempts;
    sessionStat.lastAccuracy = sessionAccuracy;

    // Keep the previous aggregate fields for saved-data compatibility.
    progress.completedSessions += 1;
    progress.totalCorrect += session.correct;
    progress.totalAttempts += session.attempts;
    progress.lastAccuracy = sessionAccuracy;
    if (session.examMode) {
      session.correctIds.forEach((itemId) => {
        progress.examCooldowns[itemProgressKey(session.difficulty, session.mode, itemId)] = session.number + 4;
      });
    }
    progress.seenIds = [...new Set([...(progress.seenIds || []), ...session.baseIds])];
    progress.history.push({
      session: session.number,
      difficulty: session.difficulty,
      mode: session.mode,
      examMode: session.examMode,
      choiceCount: session.choiceCount,
      accuracy: sessionAccuracy,
      correct: session.correct,
      wrong: session.wrong,
      date: new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date()),
    });
    progress.history = progress.history.slice(-20);
    saveProgress();

    elements.resultSessionNumber.textContent = session.number;
    elements.resultAccuracy.textContent = `${sessionAccuracy}%`;
    elements.resultCorrect.textContent = session.correct;
    elements.resultWrong.textContent = session.wrong;
    elements.resultMastered.textContent = session.total;
    const baseResultMessage = session.examMode
      ? session.wrong === 0
        ? "100문제를 모두 맞혔습니다. 정답 문제는 다음 3회차 동안 시험에서 제외됩니다."
        : `100문제 시험을 마쳤습니다. 오답 ${session.wrong}개를 다시 확인해 보세요.`
      : session.wrong === 0
        ? "한 번도 틀리지 않고 모두 맞혔습니다. 완벽해요!"
        : `오답 ${session.wrong}번도 다시 풀어 모두 익혔습니다.`;
    elements.resultMessage.textContent = newlyProtectedCount > 0
      ? `${baseResultMessage} ${newlyProtectedCount}개 단어는 다음 3회차 동안 쉬고 다시 나옵니다.`
      : baseResultMessage;
    showScreen("result");
    elements.returnButton.focus();
  }

  function returnToStart() {
    stopExamTimer();
    elements.examTimer.hidden = true;
    elements.examMistakeBadge.hidden = true;
    session = null;
    syncModeControls();
    showScreen("start");
    elements.startButton.focus();
  }

  function handleKeyboard(event) {
    if (!screens.quiz.classList.contains("is-active") || !session) return;
    const numberKey = /^[1-9]$/.test(event.key)
      ? Number(event.key)
      : /^Numpad[1-9]$/.test(event.code)
        ? Number(event.code.slice(-1))
        : null;

    if (!session.answered && session.mode === "kanji-to-kana") {
      if (numberKey !== null) {
        event.preventDefault?.();
        elements.kanaGrid.querySelectorAll("button")[numberKey - 1]?.click();
      } else if (event.key === "Backspace") {
        event.preventDefault?.();
        removeLastKana();
      } else if (event.key === "Escape" || event.key === "Delete") {
        event.preventDefault?.();
        clearKanaAnswer();
      } else if (event.key === "Enter" || event.code === "NumpadEnter") {
        event.preventDefault?.();
        submitKanaAnswer();
      }
      return;
    }

    if (!session.answered && numberKey !== null) {
      event.preventDefault?.();
      const buttons = elements.answerGrid.querySelectorAll("button");
      buttons[numberKey - 1]?.click();
    } else if (session.answered && (event.key === "Enter" || event.code === "NumpadEnter")) {
      event.preventDefault?.();
      elements.nextButton.click();
    }
  }

  function syncModeControls() {
    const sentenceMode = elements.modeSentenceKanji.checked;
    const kanaMode = elements.modeKanjiKana.checked;
    const examMode = elements.examMode.checked;
    elements.questionCountPanel.hidden = !sentenceMode;
    elements.generalQuestionCountPanel.hidden = sentenceMode;
    elements.choiceCountPicker.hidden = kanaMode;
    elements.difficultyBasic.disabled = false;

    const difficulty = selectedDifficulty();
    const mode = selectedMode();
    const nextMaximum = datasetForMode(difficulty, mode).length;

    const syncCountInput = (input) => {
      const previousMaximum = Number(input.max) || nextMaximum;
      const currentValue = Number(input.value) || previousMaximum;
      input.max = String(nextMaximum);
      if (currentValue >= previousMaximum || currentValue > nextMaximum || currentValue < 10) {
        input.value = String(nextMaximum);
      }
    };
    syncCountInput(elements.generalQuestionCount);
    syncCountInput(elements.sentenceQuestionCount);
    elements.generalQuestionCount.disabled = examMode;
    elements.sentenceQuestionCount.disabled = examMode;
    if (examMode) {
      elements.generalQuestionCount.value = String(EXAM_QUESTION_COUNT);
      elements.sentenceQuestionCount.value = String(EXAM_QUESTION_COUNT);
    }

    const generalMaximum = datasetForMode(difficulty, "kanji-to-reading").length;
    const sentenceMaximum = datasetForMode(difficulty, "sentence-to-kanji").length;
    const generalSources = {
      n5n4: "N5·N4 단어",
      n3: "N3 PDF 한자 어휘",
      n2: "N2 단어",
    };
    const sentenceSources = {
      n5n4: "능력단어 Word 예문",
      n3: "N3 실전·Tatoeba 예문",
      n2: "N2 PDF 어휘 예문",
    };
    elements.generalQuestionCountHint.textContent = examMode
      ? `시험 모드 · 100문제 고정 · ${generalSources[difficulty]}에서 출제`
      : `10~${generalMaximum}개 사이에서 선택 · ${generalSources[difficulty]}에서 출제`;
    elements.sentenceQuestionCountHint.textContent = examMode
      ? `시험 모드 · 100문제 고정 · ${sentenceSources[difficulty]}에서 출제`
      : `10~${sentenceMaximum}개 사이에서 선택 · ${sentenceSources[difficulty]}에서 출제`;

    elements.examModeState.textContent = examMode ? "ON" : "OFF";
    elements.examModeNote.classList.toggle("is-practice-note", !examMode);
    elements.startButton.textContent = examMode ? "100문제 시험 시작" : "학습 시작";
    if (examMode) {
      elements.examModeNote.hidden = false;
      const nextSessionNumber = statsFor(difficulty, mode).completedSessions + 1;
      const eligibleCount = examEligibleItems(difficulty, mode, nextSessionNumber).length;
      const enoughQuestions = eligibleCount >= EXAM_QUESTION_COUNT;
      elements.startButton.disabled = !enoughQuestions;
      elements.examModeNote.textContent = enoughQuestions
        ? `현재 ${eligibleCount}개 출제 가능 · 맞힌 문제는 이 난이도·학습 모드의 다음 3회차 동안 시험에서 제외됩니다.`
        : `현재 출제 가능한 문제가 ${eligibleCount}개라 시험을 시작할 수 없습니다. 일반 학습 회차를 진행하면 보호 기간이 지나 다시 출제됩니다.`;
    } else {
      const practiceRound = (Number(progress.practiceSessionCount) || 0) + 1;
      const practiceWordMode = isPracticeWordMode(mode);
      const practiceEligibleCount = practiceWordMode
        ? practiceEligibleItems(difficulty, mode, practiceRound).length
        : nextMaximum;
      const coolingCount = practiceWordMode ? nextMaximum - practiceEligibleCount : 0;
      elements.startButton.disabled = practiceWordMode && practiceEligibleCount === 0;
      elements.examModeNote.hidden = coolingCount === 0;
      elements.examModeNote.textContent = coolingCount > 0
        ? `무오답 3회 완료 단어 ${coolingCount}개는 복습 대기 중입니다. 현재 ${practiceEligibleCount}개 출제 가능하며, 다른 단어 연습 3회차가 지나면 다시 나옵니다.`
        : "맞힌 문제는 이 난이도·학습 모드의 다음 3회차 동안 시험에서 제외됩니다.";
    }
    renderStartScreen();
  }

  function init() {
    const invalidCoreData = datasets.n5n4.length !== 480
      || datasets.n2.length !== 100
      || datasets.n3.length < 500
      || Object.values(datasets).some((quizData) => quizData.some(
        (item) => !item.word || !item.reading || !item.meaning,
      ));
    const invalidSentenceData = Object.keys(datasets).some((difficulty) => {
      const sentenceData = datasetForMode(difficulty, "sentence-to-kanji");
      return sentenceData.length < 4 || sentenceData.some((item) => !hasCompleteSentence(item));
    });
    const invalidKanaData = Object.keys(datasets).some(
      (difficulty) => datasetForMode(difficulty, "kanji-to-kana").length < EXAM_QUESTION_COUNT,
    );
    if (Object.values(datasets).some((quizData) => quizData.length < 4)
      || invalidCoreData || invalidSentenceData || invalidKanaData) {
      elements.appError.hidden = false;
      elements.appError.textContent = "단어 데이터를 불러오지 못했습니다. 단어 데이터 파일을 확인해 주세요.";
      elements.startButton.disabled = true;
      return;
    }
    renderStartScreen();
    syncModeControls();
    elements.startButton.addEventListener("click", startSession);
    elements.homeButton.addEventListener("click", returnToStart);
    elements.nextButton.addEventListener("click", showNextQuestion);
    elements.returnButton.addEventListener("click", returnToStart);
    elements.kanaBackspace.addEventListener("click", removeLastKana);
    elements.kanaClear.addEventListener("click", clearKanaAnswer);
    elements.kanaSubmit.addEventListener("click", submitKanaAnswer);
    elements.modeKanjiReading.addEventListener("change", syncModeControls);
    elements.modeKanjiKana.addEventListener("change", syncModeControls);
    elements.modeReadingKanji.addEventListener("change", syncModeControls);
    elements.modeSentenceKanji.addEventListener("change", syncModeControls);
    elements.examMode.addEventListener("change", syncModeControls);
    elements.difficultyBasic.addEventListener("change", syncModeControls);
    elements.difficultyN3.addEventListener("change", syncModeControls);
    elements.difficultyN2.addEventListener("change", syncModeControls);
    document.addEventListener("keydown", handleKeyboard);
  }

  init();
}());
