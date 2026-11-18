(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.QuizEngine = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const missingSentenceFurigana = [
    ["清浄機", "せいじょうき"], ["対象年齢", "たいしょうねんれい"],
    ["記念", "きねん"], ["試験", "しけん"], ["日本", "にほん"],
    ["下さい", "ください"], ["連絡", "れんらく"], ["原価", "げんか"],
    ["手術", "しゅじゅつ"], ["三日", "みっか"], ["技術", "ぎじゅつ"],
    ["列車", "れっしゃ"], ["道徳", "どうとく"], ["相手", "あいて"],
    ["発展", "はってん"], ["化学", "かがく"], ["交通", "こうつう"],
    ["問題", "もんだい"], ["運動", "うんどう"], ["推理", "すいり"],
    ["選手", "せんしゅ"], ["料理", "りょうり"], ["知識", "ちしき"],
    ["進路", "しんろ"], ["旅行", "りょこう"], ["器具", "きぐ"],
    ["人気", "にんき"], ["毎日", "まいにち"], ["伝統", "でんとう"],
    ["教育", "きょういく"], ["番組", "ばんぐみ"], ["相談", "そうだん"],
    ["先週", "せんしゅう"], ["保管", "ほかん"], ["隕石", "いんせき"],
    ["酒", "さけ"], ["所", "ところ"], ["好き", "すき"],
    ["歳", "さい"], ["時", "じ"],
  ];

  function accuracy(correct, attempts) {
    if (!Number.isFinite(correct) || !Number.isFinite(attempts)
      || attempts <= 0 || correct < 0 || correct > attempts) return null;
    // Round only the displayed percentage, never the underlying answer counts.
    // Reserve 100% for a genuinely perfect score, including long-term totals.
    const percentage = Math.round((correct / attempts) * 10000) / 100;
    return Math.min(percentage, correct < attempts ? 99.99 : 100);
  }

  function normalizedReading(reading) {
    return reading.replace(/[、,/]/g, " · ").replace(/\s+/g, " ").trim();
  }

  function kanaEditState(answer = "", cursor = null, selection = null) {
    const text = String(answer || "");
    const selected = Number.isInteger(selection) && selection >= 0 && selection < text.length
      ? selection : null;
    return {
      answer: text,
      cursor: selected ?? (Number.isInteger(cursor) ? Math.max(0, Math.min(cursor, text.length)) : text.length),
      selection: selected,
    };
  }

  // A selected character is replaced; an insertion cursor adds text between characters.
  // Keep this independent of the DOM so touch, keyboard, and restored sessions agree.
  function editKana(state, action, value = null) {
    const { answer, cursor, selection } = kanaEditState(state.answer, state.cursor, state.selection);
    if (action === "select") return kanaEditState(answer, cursor, value);
    if (action === "move") return kanaEditState(answer, value);
    if (action === "left") return kanaEditState(answer, selection ?? cursor - 1);
    if (action === "right") return kanaEditState(answer, selection === null ? cursor + 1 : selection + 1);
    if (action === "home") return kanaEditState(answer, 0);
    if (action === "end") return kanaEditState(answer, answer.length);
    if (action === "clear") return kanaEditState("", 0);
    if (action === "insert") {
      if (typeof value !== "string" || !/^[ぁ-ゖー]$/.test(value)
        || (answer.length >= 20 && selection === null)) return { answer, cursor, selection };
      const suffix = cursor + (selection === null ? 0 : 1);
      return kanaEditState(answer.slice(0, cursor) + value + answer.slice(suffix), cursor + 1);
    }
    if (action === "backspace" || action === "delete") {
      const index = selection ?? (action === "backspace" ? cursor - 1 : cursor);
      if (index >= 0 && index < answer.length) {
        return kanaEditState(answer.slice(0, index) + answer.slice(index + 1), index);
      }
    }
    return { answer, cursor, selection };
  }

  function kanaReadings(reading) {
    return [...new Set(
      String(reading || "")
        .split(/[、,／/]/)
        .map((candidate) => candidate
          .trim()
          .replace(/[ァ-ヶ]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60))
          .replace(/[^ぁ-ゖー]/g, ""))
        .filter(Boolean),
    )];
  }

  function toHiragana(text) {
    return String(text || "").replace(
      /[ァ-ヶ]/g,
      (character) => String.fromCharCode(character.charCodeAt(0) - 0x60),
    );
  }

  function sentenceSurfaceReading(item) {
    if (item?.sentenceSurfaceReading) return toHiragana(item.sentenceSurfaceReading);
    const reading = kanaReadings(item?.reading)[0] || normalizedReading(item?.reading || "");
    const word = String(item?.word || "");
    const surface = String(item?.sentenceSurface || word);
    if (!word || surface === word) return reading;
    if (/^[ぁ-ゖァ-ヶー]+$/.test(surface)) return toHiragana(surface);

    let commonLength = 0;
    while (
      commonLength < word.length
      && commonLength < surface.length
      && word[commonLength] === surface[commonLength]
    ) {
      commonLength += 1;
    }

    const wordSuffix = toHiragana(word.slice(commonLength));
    const surfaceSuffix = toHiragana(surface.slice(commonLength));
    return wordSuffix && !/[一-龯々]/.test(wordSuffix) && reading.endsWith(wordSuffix)
      ? `${reading.slice(0, -wordSuffix.length)}${surfaceSuffix}`
      : reading;
  }

  function sentenceReading(item) {
    if (item?.sentenceReading) return toHiragana(item.sentenceReading).replace(/\s+/g, " ").trim();
    const annotatedSentence = String(item?.sentenceFurigana || item?.sentence || "").replace(
      "___",
      sentenceSurfaceReading(item),
    );
    let reading = toHiragana(
      annotatedSentence
        .replace(/<ruby\b[^>]*>[\s\S]*?<rt\b[^>]*>([\s\S]*?)<\/rt>[\s\S]*?<\/ruby>/gi, "$1")
        .replace(/<[^>]+>/g, ""),
    );
    missingSentenceFurigana.forEach(([kanji, hiragana]) => {
      reading = reading.replaceAll(kanji, hiragana);
    });
    return reading
      .replace("えいご語", "えいご")
      .replace("へただです", "へたです")
      .replace("はなすてください", "はなしてください")
      .replace(/\s+/g, " ")
      .trim();
  }

  function shuffle(items, random = Math.random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function resolveChoiceSettings(choiceCountOrRandom, random, dataLength) {
    if (typeof choiceCountOrRandom === "function") {
      return { choiceCount: 4, random: choiceCountOrRandom };
    }
    const requested = Number(choiceCountOrRandom) || 4;
    return {
      choiceCount: Math.min(dataLength, Math.max(2, Math.round(requested))),
      random,
    };
  }

  function buildChoices(data, correctItem, choiceCountOrRandom = 4, random = Math.random) {
    const settings = resolveChoiceSettings(choiceCountOrRandom, random, data.length);
    const sameDay = shuffle(data.filter((item) => item.day === correctItem.day && item.id !== correctItem.id), settings.random);
    const others = shuffle(data.filter((item) => item.day !== correctItem.day), settings.random);
    const pool = [...sameDay, ...others];
    const choices = [correctItem];
    // A word may accept multiple readings (e.g. 包む: くるむ / つつむ).
    // Exclude any overlap, not just identical formatted reading strings.
    const usedReadings = new Set(kanaReadings(correctItem.reading));

    for (const candidate of pool) {
      const candidateReadings = kanaReadings(candidate.reading);
      if (!candidateReadings.some((reading) => usedReadings.has(reading))) {
        choices.push(candidate);
        candidateReadings.forEach((reading) => usedReadings.add(reading));
      }
      if (choices.length === settings.choiceCount) break;
    }
    return shuffle(choices, settings.random);
  }

  function buildChoicesByWord(data, correctItem, choiceCountOrRandom = 4, random = Math.random) {
    const settings = resolveChoiceSettings(choiceCountOrRandom, random, data.length);
    const correctReadings = new Set(kanaReadings(correctItem.reading));
    const sameDay = shuffle(data.filter((item) => item.day === correctItem.day && item.id !== correctItem.id), settings.random);
    const others = shuffle(data.filter((item) => item.day !== correctItem.day), settings.random);
    const pool = [...sameDay, ...others];
    const choices = [correctItem];
    const usedWords = new Set([correctItem.word]);

    for (const candidate of pool) {
      const hasSameReading = kanaReadings(candidate.reading).some(
        (reading) => correctReadings.has(reading),
      );
      if (!hasSameReading && !usedWords.has(candidate.word)) {
        choices.push(candidate);
        usedWords.add(candidate.word);
      }
      if (choices.length === settings.choiceCount) break;
    }
    return shuffle(choices, settings.random);
  }

  function sentenceChoiceText(item) {
    return item.sentenceSurface || item.word;
  }

  // Reviewed words that fit the same blank must never be used as distractors.
  // Add these per sentence: antonyms are useful distractors in other contexts.
  const sentenceAlternativeWords = new Map([
    ["d7-2", new Set(["夏休み", "春", "秋", "冬"])],
    ["d12-8", new Set(["遠い"])],
    ["d12-12", new Set(["近い"])],
  ]);

  function buildSentenceChoices(data, correctItem, choiceCount = 4, random = Math.random) {
    const settings = resolveChoiceSettings(choiceCount, random, data.length);
    const excludedWords = sentenceAlternativeWords.get(correctItem.id);
    const targetMeanings = new Set(meaningKeys(correctItem.meaning));
    const usedSurfaces = new Set([sentenceChoiceText(correctItem)]);
    const choices = [correctItem];
    for (const candidate of shuffle(data, settings.random)) {
      if (choices.length >= settings.choiceCount) break;
      const surface = sentenceChoiceText(candidate);
      if (candidate.word === correctItem.word || usedSurfaces.has(surface)
        || excludedWords?.has(candidate.word)
        || meaningKeys(candidate.meaning).some((part) => targetMeanings.has(part))) continue;
      choices.push(candidate);
      usedSurfaces.add(surface);
    }
    return shuffle(choices, settings.random);
  }

  function meaningKeys(meaning) {
    return String(meaning).normalize("NFKC")
      .replace(/\([^)]*\)/g, "")
      .split(/[,/;·]/)
      .map((part) => {
        const text = part.replace(/\s+/g, "");
        // Treat common dictionary/nominal forms as the same distractor:
        // 유치하다 / 유치함, 짙다 / 짙음. Grading still uses actual item IDs.
        return text.replace(/(?:하다|함|다|음)$/u, "") || text;
      })
      .filter(Boolean);
  }

  function buildChoicesByMeaning(data, correctItem, choiceCountOrRandom = 4, random = Math.random) {
    const settings = resolveChoiceSettings(choiceCountOrRandom, random, data.length);
    const pool = shuffle(data.filter((item) => item.id !== correctItem.id), settings.random);
    const choices = [correctItem];
    // JLPT entries often list multiple senses. "주다" and "주다, 부여하다"
    // must not appear together as a right answer and a distractor.
    const usedMeanings = new Set(meaningKeys(correctItem.meaning));

    for (const candidate of pool) {
      const parts = meaningKeys(candidate.meaning);
      if (candidate.word !== correctItem.word && !parts.some((part) => usedMeanings.has(part))) {
        choices.push(candidate);
        parts.forEach((part) => usedMeanings.add(part));
      }
      if (choices.length === settings.choiceCount) break;
    }
    return shuffle(choices, settings.random);
  }

  function selectSessionItems(data, progress, sessionSize, random = Math.random) {
    const seen = new Set(progress.seenIds || []);
    const scored = data.map((item) => ({
      item,
      score: (progress.mistakeCounts[item.id] || 0) * 100 + (seen.has(item.id) ? 0 : 25) + random() * 20,
    }));
    scored.sort((a, b) => b.score - a.score);
    return shuffle(scored.slice(0, sessionSize).map(({ item }) => item), random);
  }

  function insertRetry(queue, itemId, delay) {
    const insertionIndex = Math.min(delay, queue.length);
    queue.splice(insertionIndex, 0, itemId);
    return insertionIndex;
  }

  function isReviewEligible(cooldowns, itemKey, practiceRound) {
    const eligibleFrom = Number(cooldowns[itemKey]) || 0;
    return practiceRound >= eligibleFrom;
  }

  function updateCleanReview(
    cleanStreaks,
    cooldowns,
    itemKeys,
    mistakenKeys,
    practiceRound,
    requiredCleanAnswers = 2,
    cooldownRounds = 2,
  ) {
    const mistakes = new Set(mistakenKeys || []);
    const protectedKeys = [];

    itemKeys.forEach((itemKey) => {
      if (mistakes.has(itemKey)) {
        cleanStreaks[itemKey] = 0;
        return;
      }

      const nextStreak = (Number(cleanStreaks[itemKey]) || 0) + 1;
      if (nextStreak >= requiredCleanAnswers) {
        cleanStreaks[itemKey] = 0;
        cooldowns[itemKey] = practiceRound + cooldownRounds + 1;
        protectedKeys.push(itemKey);
      } else {
        cleanStreaks[itemKey] = nextStreak;
      }
    });

    return protectedKeys;
  }

  function migrateScopedCounts(savedCounts, mappings) {
    const migrated = savedCounts && typeof savedCounts === "object" && !Array.isArray(savedCounts)
      ? { ...savedCounts }
      : {};

    mappings.forEach(({ scopedKey, legacyKeys = [] }) => {
      if (!Object.prototype.hasOwnProperty.call(migrated, scopedKey)) {
        const legacyKey = legacyKeys.find((key) => Object.prototype.hasOwnProperty.call(migrated, key));
        if (legacyKey !== undefined) {
          const count = Number(migrated[legacyKey]);
          migrated[scopedKey] = Number.isFinite(count) ? Math.max(0, count) : 0;
        }
      }
      legacyKeys.forEach((key) => delete migrated[key]);
    });

    return migrated;
  }

  return {
    accuracy,
    kanaEditState,
    editKana,
    normalizedReading,
    kanaReadings,
    toHiragana,
    sentenceSurfaceReading,
    sentenceChoiceText,
    sentenceReading,
    shuffle,
    buildChoices,
    buildChoicesByWord,
    buildSentenceChoices,
    buildChoicesByMeaning,
    selectSessionItems,
    insertRetry,
    isReviewEligible,
    updateCleanReview,
    migrateScopedCounts,
  };
}));
