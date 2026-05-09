import { createClient } from "@supabase/supabase-js";
import { NEW_QUESTION_BANK } from "../lib/match-drink/new-question-bank";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log("Seeding Match & Drink questions to Supabase...");
  
  // 1. Delete old questions (optional, or just upsert)
  // To ensure fresh start with traits, we delete and re-insert
  const { error: delError } = await supabase.from("match_drink_questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delError) {
    console.error("Error deleting old questions:", delError);
    return;
  }
  
  console.log("Old questions deleted.");

  // 2. Insert new questions from NEW_QUESTION_BANK
  // Note: NEW_QUESTION_BANK items might be missing IDs, we'll generate them if needed or use deterministic ones
  const questionsToInsert = NEW_QUESTION_BANK.map((q) => ({
    category: q.category,
    text: q.text,
    options: q.options,
  }));

  const { error: insError } = await supabase.from("match_drink_questions").insert(questionsToInsert);
  
  if (insError) {
    console.error("Error inserting questions:", insError);
  } else {
    console.log(`Successfully seeded ${questionsToInsert.length} questions!`);
  }
}

seed();
