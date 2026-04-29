import { seedQuestions } from "./lib/match-drink/storage";
import { QUESTION_BANK } from "./lib/match-drink/question-bank";

async function runSeed() {
  console.log("Inizio caricamento domande...");
  try {
    await seedQuestions(QUESTION_BANK);
    console.log(`Successo! Caricate ${QUESTION_BANK.length} domande.`);
    process.exit(0);
  } catch (error) {
    console.error("Errore durante il caricamento:", error);
    process.exit(1);
  }
}

runSeed();
