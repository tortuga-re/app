/**
 * Moderazione automatica per i messaggi in bottiglia.
 * Filtra parolacce e assicura che il messaggio sia in italiano.
 */

const BAD_WORDS = [
  // Italian profanities
  "cazzo", "figa", "merda", "stronzo", "vaffanculo", "culo", "troia", "puttana", "bastardo", "coglion",
  "minchia", "pompino", "segaiol", "finocchio", "frocio", "troi", "zoccol", "bocchin", "crepa", "muori",
  "negro", "ebreo", "frocio", "terrone", "polentone", "baldracca", "mignotta", "sfigato",
  // International/Common
  "fuck", "shit", "bitch", "asshole", "dick", "pussy", "nigger", "slut", "whore"
];

const ITALIAN_PARTICLES = [
  " il ", " lo ", " la ", " i ", " gli ", " le ", " di ", " a ", " da ", " in ", " con ", " su ", " per ", " tra ", " fra ",
  " e ", " o ", " ma ", " se ", " che ", " non ", " sono ", " ho ", " ha ", " abbiamo ", " avete ", " hanno ",
  " sei ", " è ", " siamo ", " siete ", " perche ", " perché ", " come ", " dove ", " quando "
];

export function moderateContent(text: string): { approved: boolean; reason?: string } {
  const lowerText = text.toLowerCase();

  // 1. Check for profanity
  for (const word of BAD_WORDS) {
    if (lowerText.includes(word)) {
      return { approved: false, reason: "profanity" };
    }
  }

  // 2. Language check (Italian only)
  // Heuristic: Must contain at least one common Italian particle or be very short (emoji)
  const words = lowerText.split(/\s+/);
  const hasItalianParticle = ITALIAN_PARTICLES.some(p => ` ${lowerText} `.includes(p));
  
  // Allow very short messages (e.g. "Ciao", "Top") or messages with common Italian endings
  const commonEndings = ["are", "ere", "ire", "ato", "uto", "ito", "iamo", "iate", "iano"];
  const hasItalianEnding = words.some(w => w.length > 4 && commonEndings.some(e => w.endsWith(e)));

  // If it's too long and has no Italian indicators, reject it
  if (text.length > 15 && !hasItalianParticle && !hasItalianEnding) {
    return { approved: false, reason: "language" };
  }

  return { approved: true };
}
