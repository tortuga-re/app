import type {
  MatchDrinkMainCategory,
  MatchDrinkPlayer,
  MatchDrinkProfile,
  MatchDrinkTrait,
} from "./types";

type MatchDrinkGender = MatchDrinkPlayer["gender"] | undefined;

export const MATCH_DRINK_TRAIT_ORDER: MatchDrinkTrait[] = [
  "romantico",
  "geloso",
  "libero",
  "caotico",
  "festaiolo",
  "diretto",
  "timido",
  "ironico",
  "pericoloso",
  "fedele",
  "investigatore",
  "orgoglioso",
];

const MAIN_CATEGORY_ORDER: MatchDrinkMainCategory[] = [
  "romantico",
  "passionale",
  "piccante",
  "energico",
];

const TRAIT_MAIN_CATEGORY_MAP: Record<MatchDrinkTrait, MatchDrinkMainCategory> = {
  romantico: "romantico",
  fedele: "romantico",
  timido: "romantico",
  diretto: "passionale",
  orgoglioso: "passionale",
  pericoloso: "passionale",
  ironico: "piccante",
  geloso: "piccante",
  investigatore: "piccante",
  festaiolo: "energico",
  libero: "energico",
  caotico: "energico",
};

const MAIN_CATEGORY_PLURALS: Record<MatchDrinkMainCategory, string> = {
  romantico: "Romantici",
  passionale: "Passionali",
  piccante: "Piccanti",
  energico: "Energici",
};

const PROFILE_MAIN_DESCRIPTION: Record<MatchDrinkMainCategory, string> = {
  romantico: "Cuore, dettagli e piccoli segnali guidano la rotta.",
  passionale: "Presenza forte, intensita e zero mezze misure.",
  piccante: "Flirt, provocazione e gioco mentale sono parte del viaggio.",
  energico: "Ritmo, spontaneita e voglia di vivere la serata fino in fondo.",
};

const PROFILE_TRAIT_DESCRIPTION: Record<MatchDrinkTrait, string> = {
  romantico: "Cerca il dettaglio giusto e la scintilla che resta.",
  geloso: "Quando sente sintonia, vuole capire subito se il campo e davvero libero.",
  libero: "Funziona meglio se la conversazione resta leggera e senza catene.",
  caotico: "Segue l'istinto, cambia ritmo in fretta e rende tutto piu imprevedibile.",
  festaiolo: "Si accende con energia, gioco e voglia di brindare.",
  diretto: "Va al punto senza troppi giri di parole.",
  timido: "Parte piano, ma quando si apre lascia il segno.",
  ironico: "Preferisce la battuta giusta alla frase perfetta.",
  pericoloso: "Ama il brivido e non punta mai alla conversazione piu ordinaria.",
  fedele: "Premia autenticita, coerenza e zero teatrini.",
  investigatore: "Non si ferma alla superficie: vuole capire cosa c'e dietro.",
  orgoglioso: "Vuole sentire carisma e una presenza che regga lo sguardo.",
};

const MATCH_DRINK_APPROACH_ADVICE: Record<MatchDrinkTrait, string> = {
  romantico:
    "Non serve strafare. Nota un dettaglio, fai una domanda vera e lascia che il brindisi faccia il resto.",
  timido:
    "Non metterlo subito sotto i riflettori. Parti con una battuta semplice, un brindisi e una domanda facile. Poi vedi se si apre.",
  diretto:
    "Qui i giri larghi servono poco. Sii chiaro, sorridi e vai al punto. Se c'e sintonia, lo capisci subito.",
  ironico:
    "Non prenderla troppo sul serio. Entra nel gioco, rispondi a tono e lascia che la battuta faccia il primo passo.",
  geloso:
    "Fagli capire che hai scelto proprio questa persona, ma senza farne un contratto notarile. Un complimento mirato vale piu di dieci frasi generiche.",
  libero:
    "Non partire con domande da interrogatorio. Proponi qualcosa di leggero: un brindisi, una sfida, una risata. Il resto si vede navigando.",
  caotico:
    "Non cercare di controllare la conversazione. Segui il ritmo, rilancia e preparati: potrebbe cambiare argomento tre volte prima del primo sorso.",
  festaiolo:
    "Parti dall'energia. Brindisi, gioco, battuta facile. Se vuoi attirare la sua attenzione, non sussurrare: accendi la serata.",
  fedele:
    "Non serve fare il misterioso. Funziona meglio essere autentici: una frase sincera, un sorriso vero e zero teatrini inutili.",
  investigatore:
    "Preparati alle domande. Non scappare: racconta qualcosa di curioso su di te. Se lo incuriosisci, hai gia mezzo piede a bordo.",
  orgoglioso:
    "Evita la gara a chi comanda. Meglio un complimento intelligente e una battuta che gli lasci spazio per sentirsi brillante.",
  pericoloso:
    "Non cercare la conversazione perfetta. Cerca quella memorabile. Una battuta audace puo funzionare, ma tieni sempre il timone.",
};

const MAIN_CATEGORY_COMPATIBILITY_BONUS: Record<
  MatchDrinkMainCategory,
  Partial<Record<MatchDrinkMainCategory, number>>
> = {
  romantico: { romantico: 20, passionale: 12, energico: 8 },
  passionale: { romantico: 12, passionale: 20, piccante: 12 },
  piccante: { passionale: 12, piccante: 20, energico: 12 },
  energico: { romantico: 8, piccante: 12, energico: 20 },
};

const TRAIT_COMPLEMENTARY_BONUS = new Set([
  "caotico-fedele",
  "diretto-timido",
  "festaiolo-libero",
  "geloso-fedele",
  "investigatore-pericoloso",
  "ironico-romantico",
  "orgoglioso-diretto",
  "romantico-pericoloso",
]);

const getGenderedLabel = (
  masculine: string,
  feminine: string,
  gender?: MatchDrinkGender,
) => (gender === "donna" ? feminine : masculine);

const getPairKey = (traitA: MatchDrinkTrait, traitB: MatchDrinkTrait) =>
  [traitA, traitB].sort().join("-");

const getTraitScore = (
  traits: Partial<Record<MatchDrinkTrait, number>>,
  trait: MatchDrinkTrait,
) => traits[trait] ?? 0;

export const getTraitMainCategory = (trait: MatchDrinkTrait): MatchDrinkMainCategory =>
  TRAIT_MAIN_CATEGORY_MAP[trait];

export const getMainCategoryLabel = (
  category: MatchDrinkMainCategory,
  gender?: MatchDrinkGender,
) => {
  switch (category) {
    case "romantico":
      return getGenderedLabel("Romantico", "Romantica", gender);
    case "passionale":
      return "Passionale";
    case "piccante":
      return "Piccante";
    case "energico":
      return getGenderedLabel("Energico", "Energica", gender);
    default:
      return "Romantico";
  }
};

export const getMainCategoryPluralLabel = (category: MatchDrinkMainCategory) =>
  MAIN_CATEGORY_PLURALS[category];

export const getTraitLabel = (trait: MatchDrinkTrait, gender?: MatchDrinkGender) => {
  switch (trait) {
    case "romantico":
      return getGenderedLabel("Romantico", "Romantica", gender);
    case "geloso":
      return "Territoriale";
    case "libero":
      return "Spirito libero";
    case "caotico":
      return getGenderedLabel("Caotico", "Caotica", gender);
    case "festaiolo":
      return getGenderedLabel("Festaiolo", "Festaiola", gender);
    case "diretto":
      return getGenderedLabel("Diretto", "Diretta", gender);
    case "timido":
      return getGenderedLabel("Timido", "Timida", gender);
    case "ironico":
      return getGenderedLabel("Ironico", "Ironica", gender);
    case "pericoloso":
      return "Pericolo pubblico";
    case "fedele":
      return "Fedele";
    case "investigatore":
      return getGenderedLabel("Investigatore", "Investigatrice", gender);
    case "orgoglioso":
      return getGenderedLabel("Orgoglioso", "Orgogliosa", gender);
    default:
      return "Ironico";
  }
};

export const getDominantTraitFromTraits = (
  traits: Partial<Record<MatchDrinkTrait, number>>,
) =>
  MATCH_DRINK_TRAIT_ORDER.reduce<MatchDrinkTrait>((bestTrait, trait) => {
    const bestScore = getTraitScore(traits, bestTrait);
    const nextScore = getTraitScore(traits, trait);

    return nextScore > bestScore ? trait : bestTrait;
  }, MATCH_DRINK_TRAIT_ORDER[0]);

export const getMainCategoryFromTraits = (
  traits: Partial<Record<MatchDrinkTrait, number>>,
): MatchDrinkMainCategory => {
  const totals = MAIN_CATEGORY_ORDER.reduce<Record<MatchDrinkMainCategory, number>>(
    (accumulator, category) => ({
      ...accumulator,
      [category]: 0,
    }),
    {
      romantico: 0,
      passionale: 0,
      piccante: 0,
      energico: 0,
    },
  );

  MATCH_DRINK_TRAIT_ORDER.forEach((trait) => {
    totals[getTraitMainCategory(trait)] += getTraitScore(traits, trait);
  });

  return MAIN_CATEGORY_ORDER.reduce<MatchDrinkMainCategory>((bestCategory, category) => {
    return totals[category] > totals[bestCategory] ? category : bestCategory;
  }, MAIN_CATEGORY_ORDER[0]);
};

export const getSecondaryTraitFromTraits = (
  traits: Partial<Record<MatchDrinkTrait, number>>,
  mainCategory?: MatchDrinkMainCategory,
) => {
  const dominantTrait = getDominantTraitFromTraits(traits);

  if (!mainCategory) {
    return dominantTrait;
  }

  return (
    MATCH_DRINK_TRAIT_ORDER.find(
      (trait) =>
        getTraitMainCategory(trait) === mainCategory &&
        getTraitScore(traits, trait) === getTraitScore(traits, dominantTrait),
    ) ?? dominantTrait
  );
};

export const getProfileDescription = (
  mainCategory: MatchDrinkMainCategory,
  secondaryTrait: MatchDrinkTrait,
) =>
  `${PROFILE_MAIN_DESCRIPTION[mainCategory]} ${PROFILE_TRAIT_DESCRIPTION[secondaryTrait]}`;

export const getApproachAdviceForTrait = (
  trait: MatchDrinkTrait,
  _targetGender?: MatchDrinkGender,
) => MATCH_DRINK_APPROACH_ADVICE[trait];

export const getSharedMainCategory = (
  profileA: Pick<MatchDrinkProfile, "mainCategory">,
  profileB: Pick<MatchDrinkProfile, "mainCategory">,
): MatchDrinkMainCategory | null =>
  profileA.mainCategory === profileB.mainCategory ? profileA.mainCategory : null;

export const getMatchDrinkRewardText = (
  category?: MatchDrinkMainCategory | null,
  meetingTableLabel?: string | null,
) => {
  void category;

  if (meetingTableLabel) {
    return `Accomodati al tavolo ${meetingTableLabel} e richiedi il tuo drink omaggio.`;
  }

  if (!category) {
    return "Accomodati al tavolo indicato e richiedi il tuo drink omaggio.";
  }
  return "Accomodati al tavolo indicato e richiedi il tuo drink omaggio.";
};

export const getMainCategoryCompatibilityBonus = (
  categoryA: MatchDrinkMainCategory,
  categoryB: MatchDrinkMainCategory,
) => MAIN_CATEGORY_COMPATIBILITY_BONUS[categoryA][categoryB] ?? 0;

export const getSecondaryTraitCompatibilityBonus = (
  traitA: MatchDrinkTrait,
  traitB: MatchDrinkTrait,
) => (TRAIT_COMPLEMENTARY_BONUS.has(getPairKey(traitA, traitB)) ? 4 : 0);
