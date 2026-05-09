import {
  MatchDrinkAnswer,
  MatchDrinkMatch,
  MatchDrinkPlayer,
  MatchDrinkProfile,
  MatchDrinkSession,
  MatchDrinkTrait,
  MatchDrinkQuestion,
} from "./types";

export const calculatePlayerProfile = (
  player: MatchDrinkPlayer,
  answers: MatchDrinkAnswer[],
  questionsBank: MatchDrinkQuestion[]
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
    const question = questionsBank.find((q) => q.id === answer.questionId);
    if (!question) return;

    const option = question.options.find((o) => o.id === answer.selectedOptionId);
    if (!option) return;

    Object.entries(option.traits || {}).forEach(([trait, score]) => {
      if (trait in traitScores) {
        traitScores[trait as MatchDrinkTrait] += score;
      }
    });
  });

  // Trova il trait dominante. Se sono tutti 0, usa un trait basato sull'ID per varietà
  let dominantTrait: MatchDrinkTrait = "ironico";
  let maxScore = 0;
  let hasScored = false;

  Object.entries(traitScores).forEach(([trait, score]) => {
    if (score > maxScore) {
      maxScore = score;
      dominantTrait = trait as MatchDrinkTrait;
      hasScored = true;
    }
  });

  // Se non ha risposto a nulla o le domande non avevano trait, assegniamo un trait deterministico
  if (!hasScored) {
    const traits: MatchDrinkTrait[] = ["ironico", "festaiolo", "libero", "caotico", "diretto"];
    const charSum = player.nickname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    dominantTrait = traits[charSum % traits.length];
  }

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

  return info[trait] || info["ironico"];
};

export const calculateMatches = (
  session: MatchDrinkSession,
  players: MatchDrinkPlayer[],
  answers: MatchDrinkAnswer[],
  questionsBank: MatchDrinkQuestion[]
): Omit<MatchDrinkMatch, "id" | "createdAt">[] => {
  // Filtriamo solo chi vuole giocare
  const eligiblePlayers = players.filter(
    (p) => p.relationshipStatus !== "solo_per_ridere"
  );

  const playerProfiles = eligiblePlayers.map((p) => {
    const playerAnswers = answers.filter((a) => a.playerId === p.id);
    return calculatePlayerProfile(p, playerAnswers, questionsBank);
  });

  const matches: Omit<MatchDrinkMatch, "id" | "createdAt">[] = [];
  const matchedPlayerIds = new Set<string>();

  // 1. Fase di Matching ad Alta Compatibilità (Rispetta i generi)
  const allPotentialPairs: { 
    aIdx: number, 
    bIdx: number, 
    score: number, 
    info: { type: MatchDrinkMatch["matchType"], criterion: string, reason: string } 
  }[] = [];

  for (let i = 0; i < eligiblePlayers.length; i++) {
    for (let j = i + 1; j < eligiblePlayers.length; j++) {
      const pA = eligiblePlayers[i];
      const pB = eligiblePlayers[j];

      if (!isGenderCompatible(pA, pB)) continue;

      const scoreInfo = calculateMatchScore(
        pA, pB,
        playerProfiles[i], playerProfiles[j],
        answers.filter(a => a.playerId === pA.id),
        answers.filter(a => a.playerId === pB.id),
        questionsBank
      );

      allPotentialPairs.push({ aIdx: i, bIdx: j, score: scoreInfo.score, info: scoreInfo });
    }
  }

  // Ordiniamo le coppie per punteggio decrescente
  allPotentialPairs.sort((a, b) => b.score - a.score);

  // Assegniamo le coppie migliori finché possibile
  allPotentialPairs.forEach(pair => {
    const pA = eligiblePlayers[pair.aIdx];
    const pB = eligiblePlayers[pair.bIdx];

    if (!matchedPlayerIds.has(pA.id) && !matchedPlayerIds.has(pB.id)) {
      matches.push({
        sessionId: session.id,
        playerAId: pA.id,
        playerBId: pB.id,
        score: pair.score,
        matchType: pair.info.type,
        label: getMatchTypeLabel(pair.info.type),
        commonCriterion: pair.info.criterion,
        reason: pair.info.reason,
        drinkUnlocked: false,
      });
      matchedPlayerIds.add(pA.id);
      matchedPlayerIds.add(pB.id);
    }
  });

  // 2. Fase di Recupero (Match forzati per chi è rimasto solo)
  // Qui ignoriamo i generi se necessario per assicurarci che nessuno (o quasi) resti solo
  const remainingPlayers = eligiblePlayers.filter(p => !matchedPlayerIds.has(p.id));
  
  while (remainingPlayers.length >= 2) {
    const pA = remainingPlayers.shift()!;
    const pB = remainingPlayers.shift()!;

    const scoreInfo = calculateMatchScore(
      pA, pB,
      playerProfiles.find(p => p.playerId === pA.id)!,
      playerProfiles.find(p => p.playerId === pB.id)!,
      answers.filter(a => a.playerId === pA.id),
      answers.filter(a => a.playerId === pB.id),
      questionsBank
    );

    matches.push({
      sessionId: session.id,
      playerAId: pA.id,
      playerBId: pB.id,
      score: Math.max(scoreInfo.score, 30), // Minimo 30% per i match di recupero
      matchType: "una_birra_e_vediamo",
      label: "Incontro del Destino",
      commonCriterion: "Ultimi naufraghi rimasti",
      reason: "Il mare vi ha trascinati sulla stessa spiaggia. Chissà che non nasca un'amicizia!",
      drinkUnlocked: false,
    });
    
    matchedPlayerIds.add(pA.id);
    matchedPlayerIds.add(pB.id);
  }

  return matches;
};

const isGenderCompatible = (a: MatchDrinkPlayer, b: MatchDrinkPlayer): boolean => {
  const check = (p1: MatchDrinkPlayer, p2: MatchDrinkPlayer) => {
    // Se cerca amicizie, è compatibile con CHIUNQUE altro cerchi amicizie (indipendentemente dal sesso)
    if (p1.lookingFor === "amicizie") return p2.lookingFor === "amicizie";
    
    // Se cerca sesso specifico, p2 deve essere di quel sesso e NON cercare solo amicizie
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
  ansB: MatchDrinkAnswer[],
  questionsBank: MatchDrinkQuestion[]
) => {
  let score = 30; // Base score più basso per avere più varietà (era 50)
  let sameAnswers = 0;
  let sharedSpicyQuestion: { questionText: string, answerText: string } | null = null;

  // Risposte uguali (Max +50)
  for (const ans of ansA) {
    const matchingAns = ansB.find((ba) => ba.questionId === ans.questionId);
    if (matchingAns && matchingAns.selectedOptionId === ans.selectedOptionId) {
      score += 6; // Leggermente meno peso (era 8)
      sameAnswers++;

      const question = questionsBank.find(q => q.id === ans.questionId);
      if (question && question.category === "spicy" && !sharedSpicyQuestion) {
        const option = question.options.find(o => o.id === ans.selectedOptionId);
        if (option) {
          sharedSpicyQuestion = { questionText: question.text, answerText: option.text };
        }
      }
    }
  }

  // Stesso trait dominante (+15)
  if (profA.dominantTrait === profB.dominantTrait) {
    score += 15;
  }

  // Bonus status (+10)
  if (a.relationshipStatus === "single" && b.relationshipStatus === "single") score += 10;
  if (a.relationshipStatus === "complicato" && b.relationshipStatus === "complicato") score += 5;

  // Bonus Amicizie (se entrambi cercano solo quello)
  if (a.lookingFor === "amicizie" && b.lookingFor === "amicizie") score += 15;

  // Penalità contrasti forti (-20)
  if (
    (profA.traits.geloso > 5 && profB.traits.libero > 5) ||
    (profB.traits.geloso > 5 && profA.traits.libero > 5)
  ) {
    score -= 20;
  }

  // Normalizza tra 10 e 100 (evitiamo lo 0 assoluto)
  score = Math.min(Math.max(score, 10), 100);

  // Determina tipo e motivo
  const type: MatchDrinkMatch["matchType"] =
    score >= 90 ? "anime_gemelle" :
      score >= 75 ? "compatibilita_sospetta" :
        score >= 50 ? "una_birra_e_vediamo" :
          "errore_consigliato";

  const reasonResult = getMatchReason(profA, profB, sameAnswers, score);
  const criterion = reasonResult.criterion;
  let reason = reasonResult.reason;

  if (sharedSpicyQuestion) {
    reason += `|SPICY_Q|${sharedSpicyQuestion.questionText}|SPICY_A|${sharedSpicyQuestion.answerText}`;
  }

  return { score, type, criterion, reason };
};

const getMatchReason = (
  profA: MatchDrinkProfile,
  profB: MatchDrinkProfile,
  sameAnswers: number,
  score: number
) => {
  // Traduzione trait in etichetta plurale
  const traitLabels: Record<string, string> = {
    romantico: "Romantici",
    geloso: "Gelosi",
    libero: "Spiriti Liberi",
    caotico: "Disastri Ambulanti",
    festaiolo: "Animali da Festa",
    diretto: "Senza Filtri",
    timido: "Timidi",
    ironico: "Sarcastiche",
    pericoloso: "Red Flag Viventi",
    fedele: "Ciurma Fedele",
    investigatore: "Detective Social",
    orgoglioso: "Orgogliosi",
  };

  if (profA.dominantTrait === profB.dominantTrait) {
    return {
      criterion: `Siete entrambi ${traitLabels[profA.dominantTrait]}`,
      reason: `Avete lo stesso approccio alla vita: ${profA.profileLabel}. Fondamentalmente vi capite senza parlare.`
    };
  }

  if (sameAnswers >= 3) {
    return {
      criterion: "Stessa visione del mondo",
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
    criterion: "Curiosità fatale",
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
  return labels[type] || "Match Casuale";
};
