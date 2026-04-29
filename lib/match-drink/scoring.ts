import { MATCH_DRINK_QUESTIONS } from "./questions";
import {
  MatchDrinkAnswer,
  MatchDrinkMatch,
  MatchDrinkPlayer,
  MatchDrinkProfile,
  MatchDrinkSession,
  MatchDrinkTrait,
} from "./types";

export const calculatePlayerProfile = (
  player: MatchDrinkPlayer,
  answers: MatchDrinkAnswer[]
): MatchDrinkProfile => {
  const traitScores: Record<MatchDrinkTrait, number> = {
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
  };

  answers.forEach((answer) => {
    const question = MATCH_DRINK_QUESTIONS.find((q) => q.id === answer.questionId);
    if (!question) return;

    const option = question.options.find((o) => o.id === answer.selectedOptionId);
    if (!option) return;

    Object.entries(option.traits).forEach(([trait, score]) => {
      traitScores[trait as MatchDrinkTrait] += score;
    });
  });

  // Trova il trait dominante
  let dominantTrait: MatchDrinkTrait = "ironico";
  let maxScore = -1;

  Object.entries(traitScores).forEach(([trait, score]) => {
    if (score > maxScore) {
      maxScore = score;
      dominantTrait = trait as MatchDrinkTrait;
    }
  });

  const { label, description } = getProfileInfo(dominantTrait);

  return {
    playerId: player.id,
    traits: traitScores,
    dominantTrait,
    profileLabel: label,
    profileDescription: description,
  };
};

const getProfileInfo = (trait: MatchDrinkTrait) => {
  const info: Record<MatchDrinkTrait, { label: string; description: string }> = {
    romantico: {
      label: "Pirata Romantico",
      description: "Cuore d'oro e mappe del tesoro scritte a mano. Credi ancora nei segnali, ma spesso sono solo fuochi di segnalazione.",
    },
    geloso: {
      label: "Guardiano del Forziere",
      description: "Dici di non essere geloso, ma hai già controllato la lista passeggeri tre volte. Ti fidi, ma verifichi.",
    },
    libero: {
      label: "Vento di Libertà",
      description: "Nessun porto è troppo stretto, nessuna ancora troppo pesante. Sei qui per il viaggio, non per la meta.",
    },
    caotico: {
      label: "Caos con Buone Intenzioni",
      description: "Sei la tempesta perfetta. Non sai come ci sei finito, ma stai facendo un gran casino e ti stai divertendo.",
    },
    festaiolo: {
      label: "Pericolo da Bancone",
      description: "La tua bussola punta sempre verso il rum. Sei l'ultimo a lasciare la nave quando c'è da festeggiare.",
    },
    diretto: {
      label: "Cannone Carico",
      description: "Non giri intorno alle isole. Se qualcosa ti piace, spari. Se non ti piace, spari uguale.",
    },
    timido: {
      label: "Naufrago Silenzioso",
      description: "Preferisci l'ombra dell'albero maestro. Ma sotto la timidezza c'è un mondo che aspetta solo di essere esplorato.",
    },
    ironico: {
      label: "Saggio del Baretto",
      description: "Ridi di tutto, soprattutto dei tuoi errori. La tua arma migliore è una battuta pronta quando tutto affonda.",
    },
    pericoloso: {
      label: "Red Flag Galleggiante",
      description: "Tutti dovrebbero scappare, e invece ti corrono dietro. Sei quel brivido che rovina le serate tranquille.",
    },
    fedele: {
      label: "Ancora Sicura",
      description: "Sei il porto sicuro in ogni tempesta. Chi ti trova non ti lascia più, a meno che non sia pazzo.",
    },
    investigatore: {
      label: "Investigatore Emotivo",
      description: "Hai già fatto tre teorie e due screenshot prima ancora di dire ciao. Nulla sfugge alla tua analisi.",
    },
    orgoglioso: {
      label: "Sereno Solo in Superficie",
      description: "Dici che va tutto bene. Internamente stai scrivendo una sceneggiatura per il tuo prossimo confronto drammatico.",
    },
  };

  return info[trait];
};

export const calculateMatches = (
  session: MatchDrinkSession,
  players: MatchDrinkPlayer[],
  answers: MatchDrinkAnswer[]
): Omit<MatchDrinkMatch, "id" | "createdAt">[] => {
  const eligiblePlayers = players.filter(
    (p) => p.relationshipStatus !== "solo_per_ridere"
  );

  const playerProfiles = eligiblePlayers.map((p) => {
    const playerAnswers = answers.filter((a) => a.playerId === p.id);
    return calculatePlayerProfile(p, playerAnswers);
  });

  const matches: Omit<MatchDrinkMatch, "id" | "createdAt">[] = [];
  const matchedPlayerIds = new Set<string>();

  // Semplice algoritmo di matching
  for (let i = 0; i < eligiblePlayers.length; i++) {
    const playerA = eligiblePlayers[i];
    if (matchedPlayerIds.has(playerA.id)) continue;

    let bestMatch: { player: MatchDrinkPlayer; score: number; reason: string; criterion: string; type: MatchDrinkMatch["matchType"] } | null = null;

    for (let j = i + 1; j < eligiblePlayers.length; j++) {
      const playerB = eligiblePlayers[j];
      if (matchedPlayerIds.has(playerB.id)) continue;

      // Verifica preferenze di genere
      if (!isGenderCompatible(playerA, playerB)) continue;

      // Evita match tra persone dello stesso tavolo
      if (playerA.tableNumber && playerB.tableNumber && playerA.tableNumber === playerB.tableNumber) {
        continue;
      }

      const scoreInfo = calculateMatchScore(
        playerA,
        playerB,
        playerProfiles.find((p) => p.playerId === playerA.id)!,
        playerProfiles.find((p) => p.playerId === playerB.id)!,
        answers.filter((a) => a.playerId === playerA.id),
        answers.filter((a) => a.playerId === playerB.id)
      );

      if (!bestMatch || scoreInfo.score > bestMatch.score) {
        bestMatch = {
          player: playerB,
          ...scoreInfo,
        };
      }
    }

    if (bestMatch && bestMatch.score > 40) {
      matches.push({
        sessionId: session.id,
        playerAId: playerA.id,
        playerBId: bestMatch.player.id,
        score: bestMatch.score,
        matchType: bestMatch.type,
        label: getMatchTypeLabel(bestMatch.type),
        commonCriterion: bestMatch.criterion,
        reason: bestMatch.reason,
        drinkUnlocked: false,
      });
      matchedPlayerIds.add(playerA.id);
      matchedPlayerIds.add(bestMatch.player.id);
    }
  }

  return matches;
};

const isGenderCompatible = (a: MatchDrinkPlayer, b: MatchDrinkPlayer): boolean => {
  const check = (p1: MatchDrinkPlayer, p2: MatchDrinkPlayer) => {
    if (p1.lookingFor === "amicizie") return p2.lookingFor === "amicizie";
    if (p1.lookingFor === "uomo") return p2.gender === "uomo" && p2.lookingFor !== "amicizie";
    if (p1.lookingFor === "donna") return p2.gender === "donna" && p2.lookingFor !== "amicizie";
    if (p1.lookingFor === "entrambi") return ["uomo", "donna"].includes(p2.gender) && p2.lookingFor !== "amicizie";
    return false;
  };

  return check(a, b) && check(b, a);
};

const calculateMatchScore = (
  a: MatchDrinkPlayer,
  b: MatchDrinkPlayer,
  profA: MatchDrinkProfile,
  profB: MatchDrinkProfile,
  ansA: MatchDrinkAnswer[],
  ansB: MatchDrinkAnswer[]
) => {
  let score = 50; // Base score
  let sameAnswers = 0;

  // Risposte uguali
  ansA.forEach((ans) => {
    const matchingAns = ansB.find((ba) => ba.questionId === ans.questionId);
    if (matchingAns && matchingAns.selectedOptionId === ans.selectedOptionId) {
      score += 8;
      sameAnswers++;
    }
  });

  // Stesso trait dominante
  if (profA.dominantTrait === profB.dominantTrait) {
    score += 15;
  }

  // Bonus status
  if (a.relationshipStatus === "single" && b.relationshipStatus === "single") score += 10;
  if (a.relationshipStatus === "complicato" && b.relationshipStatus === "complicato") score += 5;

  // Penalità contrasti forti
  if (
    (profA.traits.geloso > 5 && profB.traits.libero > 5) ||
    (profB.traits.geloso > 5 && profA.traits.libero > 5)
  ) {
    score -= 20;
  }

  // Normalizza
  score = Math.min(Math.max(score, 0), 100);

  // Determina tipo e motivo
  const type: MatchDrinkMatch["matchType"] = 
    score > 85 ? "anime_gemelle" : 
    score > 70 ? "compatibilita_sospetta" : 
    score > 55 ? "una_birra_e_vediamo" : 
    "errore_consigliato";

  const { criterion, reason } = getMatchReason(profA, profB, sameAnswers, score);

  return { score, type, criterion, reason };
};

const getMatchReason = (
  profA: MatchDrinkProfile,
  profB: MatchDrinkProfile,
  sameAnswers: number,
  score: number
) => {
  if (profA.dominantTrait === profB.dominantTrait) {
    return {
      criterion: `Siete entrambi ${profA.dominantTrait === "caotico" ? "due disastri" : profA.dominantTrait + "s"}`,
      reason: `Avete lo stesso approccio alla vita: ${profA.profileLabel}. Fondamentalmente vi capite senza parlare.`
    };
  }

  if (sameAnswers >= 3) {
    return {
      criterion: "Stessa visione del mondo (o quasi)",
      reason: `Avete dato ${sameAnswers} risposte identiche. È inquietante o è destino? Decidete voi.`
    };
  }

  if (score > 60) {
    return {
      criterion: "Red flag compatibili",
      reason: "Le vostre nevrosi sembrano incastrarsi bene. Un drink potrebbe aiutare a confermarlo."
    };
  }

  return {
    criterion: "Una birra e vediamo",
    reason: "Il sistema non è sicurissimo, ma il Capitano dice che valete un brindisi."
  };
};

const getMatchTypeLabel = (type: MatchDrinkMatch["matchType"]) => {
  const labels: Record<MatchDrinkMatch["matchType"], string> = {
    anime_gemelle: "Anime Gemelle",
    errore_consigliato: "Errore Consigliato",
    red_flag_compatibili: "Red Flag Compatibili",
    una_birra_e_vediamo: "Una Birra e Vediamo",
    pericolo_pubblico: "Pericolo Pubblico",
    compatibilita_sospetta: "Compatibilità Sospetta",
  };
  return labels[type];
};
