import {
  MatchDrinkAnswer,
  MatchDrinkMatch,
  MatchDrinkMainCategory,
  MatchDrinkPlayer,
  MatchDrinkProfile,
  MatchDrinkQuestion,
  MatchDrinkSession,
  MatchDrinkTrait,
} from "./types";
import {
  MATCH_DRINK_TRAIT_ORDER,
  getMainCategoryCompatibilityBonus,
  getMainCategoryFromTraits,
  getMainCategoryLabel,
  getMainCategoryPluralLabel,
  getProfileDescription,
  getSecondaryTraitCompatibilityBonus,
  getSecondaryTraitFromTraits,
  getSharedMainCategory,
  getTraitLabel,
  getDominantTraitFromTraits,
  getTraitMainCategory,
  type MatchDrinkMainCategoryNormalizer,
} from "./profile";

const createEmptyTraitScores = (): Record<MatchDrinkTrait, number> => ({
  romantico: 0,
  geloso: 0,
  libero: 0,
  caotico: 0,
  festaiolo: 0,
  diretto: 0,
  timido: 0,
  ironico: 0,
  pericoloso: 0,
  fedele: 0,
  investigatore: 0,
  orgoglioso: 0,
});

const buildTraitScores = (
  answers: MatchDrinkAnswer[],
  questionsBank: MatchDrinkQuestion[],
) => {
  const traitScores = createEmptyTraitScores();
  const questionsById = new Map(questionsBank.map((question) => [question.id, question]));

  answers.forEach((answer) => {
    const question = questionsById.get(answer.questionId);
    if (!question) {
      return;
    }

    const option = question.options.find(
      (questionOption) => questionOption.id === answer.selectedOptionId,
    );

    if (!option?.traits) {
      return;
    }

    Object.entries(option.traits).forEach(([trait, score]) => {
      if (!(trait in traitScores) || typeof score !== "number") {
        return;
      }

      traitScores[trait as MatchDrinkTrait] += score;
    });
  });

  return traitScores;
};

const hasMeaningfulTraitScores = (traitScores: Record<MatchDrinkTrait, number>) =>
  Object.values(traitScores).some((score) => score > 0);

const getDeterministicFallbackTrait = (player: MatchDrinkPlayer) => {
  const source = `${player.nickname}|${player.tableNumber ?? ""}|${player.id}`;
  const charSum = source.split("").reduce((total, char) => total + char.charCodeAt(0), 0);

  return MATCH_DRINK_TRAIT_ORDER[charSum % MATCH_DRINK_TRAIT_ORDER.length];
};

const buildProfileLabel = (
  mainCategoryLabel: string,
  secondaryTraitLabel: string,
) => {
  if (mainCategoryLabel.toLowerCase() === secondaryTraitLabel.toLowerCase()) {
    return mainCategoryLabel;
  }

  return `${mainCategoryLabel} ${secondaryTraitLabel}`;
};

const createEmptyMainCategoryScores = (): Record<MatchDrinkMainCategory, number> => ({
  romantico: 0,
  passionale: 0,
  piccante: 0,
  energico: 0,
});

const buildMainCategoryNormalizer = (
  questionsBank: MatchDrinkQuestion[],
): MatchDrinkMainCategoryNormalizer => {
  const normalizer = createEmptyMainCategoryScores();

  questionsBank.forEach((question) => {
    question.options.forEach((option) => {
      Object.entries(option.traits ?? {}).forEach(([trait, score]) => {
        if (!MATCH_DRINK_TRAIT_ORDER.includes(trait as MatchDrinkTrait) || typeof score !== "number") {
          return;
        }

        normalizer[getTraitMainCategory(trait as MatchDrinkTrait)] += score;
      });
    });
  });

  return normalizer;
};

type MatchReasonResult = {
  criterion: string;
  reason: string;
};

export const calculatePlayerProfile = (
  player: MatchDrinkPlayer,
  answers: MatchDrinkAnswer[],
  questionsBank: MatchDrinkQuestion[],
  mainCategoryNormalizer: MatchDrinkMainCategoryNormalizer = buildMainCategoryNormalizer(questionsBank),
): MatchDrinkProfile => {
  const traitScores = buildTraitScores(answers, questionsBank);

  if (!hasMeaningfulTraitScores(traitScores)) {
    traitScores[getDeterministicFallbackTrait(player)] = 1;
  }

  const dominantTrait = getDominantTraitFromTraits(traitScores);
  const mainCategory = getMainCategoryFromTraits(traitScores, mainCategoryNormalizer);
  const secondaryTrait = getSecondaryTraitFromTraits(traitScores, mainCategory);
  const mainCategoryLabel = getMainCategoryLabel(mainCategory, player.gender);
  const secondaryTraitLabel = getTraitLabel(secondaryTrait, player.gender);

  return {
    playerId: player.id,
    traits: traitScores,
    dominantTrait,
    mainCategory,
    mainCategoryLabel,
    secondaryTrait,
    secondaryTraitLabel,
    profileLabel: buildProfileLabel(mainCategoryLabel, secondaryTraitLabel),
    profileDescription: getProfileDescription(mainCategory, secondaryTrait),
  };
};

type ScoredPotentialPair = {
  aIdx: number;
  bIdx: number;
  score: number;
  info: { type: MatchDrinkMatch["matchType"]; criterion: string; reason: string };
};

type MatchingResult = {
  pairCount: number;
  score: number;
  pairs: ScoredPotentialPair[];
};

const getPairKey = (aIdx: number, bIdx: number) =>
  aIdx < bIdx ? `${aIdx}:${bIdx}` : `${bIdx}:${aIdx}`;

const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);

const getBit = (index: number) => BIGINT_ONE << BigInt(index);

const getFirstSetBitIndex = (mask: bigint, playerCount: number) => {
  for (let index = 0; index < playerCount; index += 1) {
    if ((mask & getBit(index)) !== BIGINT_ZERO) {
      return index;
    }
  }

  return -1;
};

const findMaximumWeightMatching = (
  playerCount: number,
  pairs: ScoredPotentialPair[],
): ScoredPotentialPair[] => {
  if (playerCount < 2) {
    return [];
  }

  const pairsByKey = new Map(
    pairs.map((pair) => [getPairKey(pair.aIdx, pair.bIdx), pair]),
  );
  const fullMask = (BIGINT_ONE << BigInt(playerCount)) - BIGINT_ONE;
  const memo = new Map<string, MatchingResult>();

  const isBetter = (candidate: MatchingResult, current: MatchingResult) =>
    candidate.pairCount > current.pairCount ||
    (candidate.pairCount === current.pairCount && candidate.score > current.score);

  const solve = (mask: bigint): MatchingResult => {
    if (mask === BIGINT_ZERO) {
      return { pairCount: 0, score: 0, pairs: [] };
    }

    const key = mask.toString();
    const cached = memo.get(key);
    if (cached) {
      return cached;
    }

    const firstIdx = getFirstSetBitIndex(mask, playerCount);
    const maskWithoutFirst = mask & ~getBit(firstIdx);
    let best = solve(maskWithoutFirst);

    for (let secondIdx = firstIdx + 1; secondIdx < playerCount; secondIdx += 1) {
      const secondBit = getBit(secondIdx);
      if ((maskWithoutFirst & secondBit) === BIGINT_ZERO) {
        continue;
      }

      const pair = pairsByKey.get(getPairKey(firstIdx, secondIdx));
      if (!pair) {
        continue;
      }

      const rest = solve(maskWithoutFirst & ~secondBit);
      const candidate = {
        pairCount: rest.pairCount + 1,
        score: pair.score + rest.score,
        pairs: [pair, ...rest.pairs],
      };

      if (isBetter(candidate, best)) {
        best = candidate;
      }
    }

    memo.set(key, best);
    return best;
  };

  return solve(fullMask).pairs;
};

export const calculateMatches = (
  session: MatchDrinkSession,
  players: MatchDrinkPlayer[],
  answers: MatchDrinkAnswer[],
  questionsBank: MatchDrinkQuestion[],
): Omit<MatchDrinkMatch, "id" | "createdAt">[] => {
  const eligiblePlayers = players.filter(
    (player) => player.nickname !== "_SYSTEM_",
  );
  const answersByPlayer = new Map<string, MatchDrinkAnswer[]>();
  const mainCategoryNormalizer = buildMainCategoryNormalizer(questionsBank);

  answers.forEach((answer) => {
    const currentAnswers = answersByPlayer.get(answer.playerId) ?? [];
    currentAnswers.push(answer);
    answersByPlayer.set(answer.playerId, currentAnswers);
  });

  const profilesByPlayerId = new Map<string, MatchDrinkProfile>();

  eligiblePlayers.forEach((player) => {
    profilesByPlayerId.set(
      player.id,
      calculatePlayerProfile(
        player,
        answersByPlayer.get(player.id) ?? [],
        questionsBank,
        mainCategoryNormalizer,
      ),
    );
  });

  const allPotentialPairs: ScoredPotentialPair[] = [];

  for (let i = 0; i < eligiblePlayers.length; i += 1) {
    for (let j = i + 1; j < eligiblePlayers.length; j += 1) {
      const playerA = eligiblePlayers[i];
      const playerB = eligiblePlayers[j];

      if (!isGenderCompatible(playerA, playerB)) {
        continue;
      }

      const scoreInfo = calculateMatchScore(
        playerA,
        playerB,
        profilesByPlayerId.get(playerA.id)!,
        profilesByPlayerId.get(playerB.id)!,
        answersByPlayer.get(playerA.id) ?? [],
        answersByPlayer.get(playerB.id) ?? [],
        questionsBank,
      );

      allPotentialPairs.push({
        aIdx: i,
        bIdx: j,
        score: scoreInfo.score,
        info: {
          criterion: scoreInfo.criterion,
          reason: scoreInfo.reason,
          type: scoreInfo.type,
        },
      });
    }
  }

  return findMaximumWeightMatching(eligiblePlayers.length, allPotentialPairs).map((pair) => {
    const playerA = eligiblePlayers[pair.aIdx];
    const playerB = eligiblePlayers[pair.bIdx];

    return {
      sessionId: session.id,
      playerAId: playerA.id,
      playerBId: playerB.id,
      score: pair.score,
      matchType: pair.info.type,
      label: getMatchTypeLabel(pair.info.type),
      commonCriterion: pair.info.criterion,
      reason: pair.info.reason,
      drinkUnlocked: false,
    };
  });
};

const isGenderCompatible = (playerA: MatchDrinkPlayer, playerB: MatchDrinkPlayer): boolean => {
  const checkCompatibility = (sourcePlayer: MatchDrinkPlayer, targetPlayer: MatchDrinkPlayer) => {
    if (sourcePlayer.lookingFor === "amicizie") {
      return targetPlayer.lookingFor === "amicizie";
    }

    if (sourcePlayer.lookingFor === "uomo") {
      return targetPlayer.gender === "uomo" && targetPlayer.lookingFor !== "amicizie";
    }

    if (sourcePlayer.lookingFor === "donna") {
      return targetPlayer.gender === "donna" && targetPlayer.lookingFor !== "amicizie";
    }

    if (sourcePlayer.lookingFor === "entrambi") {
      return (
        ["uomo", "donna"].includes(targetPlayer.gender) &&
        targetPlayer.lookingFor !== "amicizie"
      );
    }

    return false;
  };

  return checkCompatibility(playerA, playerB) && checkCompatibility(playerB, playerA);
};

const getMatchTypeFromScore = (score: number): MatchDrinkMatch["matchType"] =>
  score >= 90
    ? "anime_gemelle"
    : score >= 75
      ? "compatibilita_sospetta"
      : score >= 50
        ? "una_birra_e_vediamo"
        : "errore_consigliato";

const calculateMatchScore = (
  playerA: MatchDrinkPlayer,
  playerB: MatchDrinkPlayer,
  profileA: MatchDrinkProfile,
  profileB: MatchDrinkProfile,
  answersA: MatchDrinkAnswer[],
  answersB: MatchDrinkAnswer[],
  questionsBank: MatchDrinkQuestion[],
) => {
  const answersByQuestionId = new Map(
    answersB.map((answer) => [answer.questionId, answer]),
  );
  const questionsById = new Map(questionsBank.map((question) => [question.id, question]));
  const sharedMainCategory = getSharedMainCategory(profileA, profileB);

  let score = 28;
  let sameAnswers = 0;
  let sharedSpicyQuestionText = "";
  let sharedSpicyAnswerText = "";

  answersA.forEach((answer) => {
    const matchingAnswer = answersByQuestionId.get(answer.questionId);
    if (!matchingAnswer || matchingAnswer.selectedOptionId !== answer.selectedOptionId) {
      return;
    }

    score += 6;
    sameAnswers += 1;

    const question = questionsById.get(answer.questionId);
    if (
      !question ||
      question.category !== "spicy" ||
      (sharedSpicyQuestionText && sharedSpicyAnswerText)
    ) {
      return;
    }

    const option = question.options.find((candidate) => candidate.id === answer.selectedOptionId);
    if (!option) {
      return;
    }

    sharedSpicyQuestionText = question.text;
    sharedSpicyAnswerText = option.text;
  });

  score += getMainCategoryCompatibilityBonus(profileA.mainCategory, profileB.mainCategory);
  score += getSecondaryTraitCompatibilityBonus(
    profileA.secondaryTrait,
    profileB.secondaryTrait,
  );

  if (profileA.secondaryTrait === profileB.secondaryTrait) {
    score += 8;
  }

  if (profileA.dominantTrait === profileB.dominantTrait) {
    score += 6;
  }

  if (playerA.relationshipStatus === "single" && playerB.relationshipStatus === "single") {
    score += 10;
  }

  if (
    playerA.relationshipStatus === "complicato" &&
    playerB.relationshipStatus === "complicato"
  ) {
    score += 5;
  }

  if (playerA.lookingFor === "amicizie" && playerB.lookingFor === "amicizie") {
    score += 15;
  }

  if (
    (profileA.traits.geloso > 5 && profileB.traits.libero > 5) ||
    (profileB.traits.geloso > 5 && profileA.traits.libero > 5)
  ) {
    score -= 20;
  }

  score = Math.min(Math.max(score, 10), 100);

  const type = getMatchTypeFromScore(score);

  const matchReason = getMatchReason(
    playerA,
    playerB,
    profileA,
    profileB,
    sameAnswers,
    score,
    sharedMainCategory,
  );
  let reason = matchReason.reason;

  if (sharedSpicyQuestionText && sharedSpicyAnswerText) {
    reason += `|SPICY_Q|${sharedSpicyQuestionText}|SPICY_A|${sharedSpicyAnswerText}`;
  }

  return {
    score,
    type,
    criterion: matchReason.criterion,
    reason,
  };
};

const getMatchReason = (
  playerA: MatchDrinkPlayer,
  playerB: MatchDrinkPlayer,
  profileA: MatchDrinkProfile,
  profileB: MatchDrinkProfile,
  sameAnswers: number,
  score: number,
  sharedMainCategory: MatchDrinkProfile["mainCategory"] | null,
): MatchReasonResult => {
  if (sharedMainCategory) {
    return {
      criterion: `Siete entrambi ${getMainCategoryPluralLabel(sharedMainCategory)}`,
      reason: `Avete una vibrazione di base simile: ${profileA.profileLabel} e ${profileB.profileLabel}. Il Capitano vuole vedere come va a finire dal vivo.`,
    };
  }

  if (sameAnswers >= 3) {
    return {
      criterion: "Stessa lunghezza d'onda",
      reason: `Avete dato ${sameAnswers} risposte identiche. O vi siete capiti subito, o state per scoprirlo davanti a un brindisi.`,
    };
  }

  if (score >= 75) {
    return {
      criterion: "Categorie che possono incendiarsi bene",
      reason: `Tu sei ${getMainCategoryLabel(profileA.mainCategory, playerA.gender)}, il match e ${getMainCategoryLabel(profileB.mainCategory, playerB.gender)}. Abbastanza diversi da incuriosirsi, abbastanza vicini da capirsi.`,
    };
  }

  if (score >= 60) {
    return {
      criterion: "Curiosita reciproca",
      reason: `Tra ${getTraitLabel(profileA.secondaryTrait, playerA.gender)} e ${getTraitLabel(profileB.secondaryTrait, playerB.gender)} c'e il potenziale per una serata meno prevedibile del solito.`,
    };
  }

  return {
    criterion: "Brindisi da verificare",
    reason:
      "Il sistema non promette miracoli, ma il Capitano pensa che valga comunque la pena provarci dal vivo.",
  };
};

const getMatchTypeLabel = (type: MatchDrinkMatch["matchType"]) => {
  const labels: Record<MatchDrinkMatch["matchType"], string> = {
    anime_gemelle: "Anime Gemelle",
    errore_consigliato: "Errore Consigliato",
    red_flag_compatibili: "Red Flag Compatibili",
    una_birra_e_vediamo: "Una Birra e Vediamo",
    pericolo_pubblico: "Pericolo Pubblico",
    compatibilita_sospetta: "Compatibilita Sospetta",
  };

  return labels[type] ?? "Match Casuale";
};
