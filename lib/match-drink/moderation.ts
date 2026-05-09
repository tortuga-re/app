/**
 * Moderazione automatica per i messaggi in bottiglia.
 * Filtra parolacce e assicura che il messaggio sia in italiano.
 */

const PROFANITY_ROOTS = [
  "cazo", "figa", "merda", "stronzo", "vafanculo", "culo", "troia", "putana", "bastard", "coglion",
  "minchia", "pompino", "sega", "finochio", "frocio", "zocol", "bochin", "crepa", "muori",
  "negro", "ebreo", "terone", "polentone", "baldraca", "mignota", "sfigat", "pale",
  "fuck", "shit", "bitch", "ashole", "dick", "pusy", "niger", "slut", "whore"
];

const ITALIAN_PARTICLES = [
  " il ", " lo ", " la ", " i ", " gli ", " le ", " di ", " a ", " da ", " in ", " con ", " su ", " per ", " tra ", " fra ",
  " e ", " o ", " ma ", " se ", " che ", " non ", " sono ", " ho ", " ha ", " abbiamo ", " avete ", " hanno ",
  " sei ", " è ", " siamo ", " siete ", " perche ", " perché ", " come ", " dove ", " quando ", " tivvuole ", " tivoglio "
];

/**
 * Trasformazione estrema per scovare messaggi nascosti.
 * 1. Converte simboli e numeri in lettere.
 * 2. Rimuove TUTTO ciò che non è una lettera (punti, spazi, trattini).
 * 3. Collassa le lettere doppie (es: "caaaaazzzo" -> "cazo").
 */
function ultraNormalize(text: string): string {
  const leet = text.toLowerCase()
    .replace(/4/g, "a").replace(/3/g, "e").replace(/1/g, "i").replace(/0/g, "o").replace(/5/g, "s").replace(/7/g, "t").replace(/8/g, "b")
    .replace(/!/g, "i").replace(/@/g, "a").replace(/\$/g, "s")
    .replace(/xx/g, "zz"); // c4xxo -> cazz0

  const onlyLetters = leet.replace(/[^a-z]/g, "");
  
  // Collassa lettere ripetute (es: "aaabbb" -> "ab")
  return onlyLetters.replace(/(.)\1+/g, "$1");
}

export function moderateContent(text: string): { approved: boolean; reason?: string } {
  const normalized = ultraNormalize(text);

  // 1. Controllo Profanità "Titanium"
  for (const root of PROFANITY_ROOTS) {
    if (normalized.includes(root)) {
      // Eccezioni per evitare falsi positivi comuni (es: qualifica, veicolo)
      const lower = text.toLowerCase();
      if (root === "figa" && lower.includes("qualifica")) continue;
      if (root === "culo" && lower.includes("veicolo")) continue;
      
      return { approved: false, reason: "profanity" };
    }
  }

  // 2. Language check (Italian only)
  // Usiamo una normalizzazione più blanda per preservare gli spazi e le particelle
  const simpleNormalized = text.toLowerCase().replace(/[^a-z\s]/g, " ");
  const words = simpleNormalized.split(/\s+/).filter(w => w.length > 0);
  const hasItalianParticle = ITALIAN_PARTICLES.some(p => ` ${simpleNormalized} `.includes(p));
  
  const commonEndings = ["are", "ere", "ire", "ato", "uto", "ito", "iamo", "iate", "iano", "issimo", "ismo"];
  const hasItalianEnding = words.some(w => w.length > 4 && commonEndings.some(e => w.endsWith(e)));

  // Se il messaggio è lungo e non ha indicatori di italiano, lo rifiutiamo
  if (text.length > 15 && !hasItalianParticle && !hasItalianEnding) {
    return { approved: false, reason: "language" };
  }

  return { approved: true };
}
