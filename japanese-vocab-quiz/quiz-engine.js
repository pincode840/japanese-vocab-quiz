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
    return attempts ? Math.round((correct / attempts) * 100) : null;
  }

  function normalizedReading(reading) {
    return reading.replace(/[、,/]/g, " · ").replace(/\s+/g, " ").trim();
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
    const reading = kanaReadings(item?.reading)[0] || normalizedReading(item?.reading || "");
    const word = String(item?.word || "");
    const surface = String(item?.sentenceSurface || word);
    if (!word || surface === word) return reading;

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
    const correctReading = normalizedReading(correctItem.reading);
    const sameDay = shuffle(data.filter((item) => item.day === correctItem.day && item.id !== correctItem.id), settings.random);
    const others = shuffle(data.filter((item) => item.day !== correctItem.day), settings.random);
    const pool = [...sameDay, ...others];
    const choices = [correctItem];
    const usedReadings = new Set([correctReading]);

    for (const candidate of pool) {
      const candidateReading = normalizedReading(candidate.reading);
      if (!usedReadings.has(candidateReading)) {
        choices.push(candidate);
        usedReadings.add(candidateReading);
      }
      if (choices.length === settings.choiceCount) break;
    }
    return shuffle(choices, settings.random);
  }

  function buildChoicesByWord(data, correctItem, choiceCountOrRandom = 4, random = Math.random) {
    const settings = resolveChoiceSettings(choiceCountOrRandom, random, data.length);
    const correctReading = normalizedReading(correctItem.reading);
    const sameDay = shuffle(data.filter((item) => item.day === correctItem.day && item.id !== correctItem.id), settings.random);
    const others = shuffle(data.filter((item) => item.day !== correctItem.day), settings.random);
    const pool = [...sameDay, ...others];
    const choices = [correctItem];
    const usedWords = new Set([correctItem.word]);

    for (const candidate of pool) {
      const hasSameReading = normalizedReading(candidate.reading) === correctReading;
      if (!hasSameReading && !usedWords.has(candidate.word)) {
        choices.push(candidate);
        usedWords.add(candidate.word);
      }
      if (choices.length === settings.choiceCount) break;
    }
    return shuffle(choices, settings.random);
  }

  function buildChoicesByMeaning(data, correctItem, choiceCountOrRandom = 4, random = Math.random) {
    const settings = resolveChoiceSettings(choiceCountOrRandom, random, data.length);
    const pool = shuffle(data.filter((item) => item.id !== correctItem.id), settings.random);
    const choices = [correctItem];
    const usedMeanings = new Set([correctItem.meaning]);

    for (const candidate of pool) {
      if (!usedMeanings.has(candidate.meaning)) {
        choices.push(candidate);
        usedMeanings.add(candidate.meaning);
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
    normalizedReading,
    kanaReadings,
    toHiragana,
    sentenceSurfaceReading,
    sentenceReading,
    shuffle,
    buildChoices,
    buildChoicesByWord,
    buildChoicesByMeaning,
    selectSessionItems,
    insertRetry,
    isReviewEligible,
    updateCleanReview,
    migrateScopedCounts,
  };
}));
