import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const fallbackTeams: Record<"friday" | "saturday" | "sunday", string[]> = {
  friday: ["I Pirati del Gnocco", "Tavolo 17", "I Bucanieri", "La Ciurma Ribelle", "Steakhouse Raiders", "Gli Squaletti", "I Corsari di Reggio", "Tortuga United", "Le Tigelle Volanti", "I Senza Bussola", "Capitan Spritz", "Gli Ammutinati", "I Lupi di Mare", "Burger Brigade", "La Perla Nera", "I Dobloni d'Oro", "Gli Sbarcati", "Tavolo del Capitano", "I Gabbiani Pirata", "Gli Ancorati", "La Flotta del Venerdì", "I Cannoni", "The Tortugans", "I Marinai", "Ciurma 404", "I Corsari Rossi", "Tigella Team", "Gli Squali", "La Rotta Segreta", "I Leggendari"],
  saturday: ["I Fuori Rotta", "Le Tigelle di Mezzanotte", "Tavolo 42", "I Razziatori", "Burger & Glory", "Le Sirene Stanche", "Capitan Scontrino", "Gli Inaffondabili", "La Brigata del Rum", "I Dobloni Smarriti", "Pirates of Piadina", "Gli Squali Gentili", "Tortuga Club", "I Senza Freno", "La Ciurma del Sabato", "Gli Assi nella Manica", "Steakhouse Society", "Tavolo degli Eroi", "I Dritti al Punto", "Le Cozze Coraggiose", "I Figli del Mare", "Corsari 2.0", "Il Team Che Non C'era", "Gli Intrepidi", "La Banda del Baule", "I Galleoni", "Tigella Power", "Gli Ultimi Arrivati", "Capitani per Caso", "L'Equipaggio Reale"],
  sunday: ["I Domenicali", "La Ciurma Tranquilla", "Tavolo 8", "I Pirati in Ciabatte", "Sunday Raiders", "Gli Affamati", "Le Tigelle Felici", "I Lupi di Mare Calmi", "La Perla della Domenica", "Capitan Pisolo", "Gli Esploratori", "Tortuga Family", "I Dobloni di Carta", "La Squadra delle 21", "Gli Amici del Baule", "Steak & Smile", "I Corsari Buoni", "Tavolo dei Sogni", "I Marinai della Sera", "Gli Incrociati", "La Rotta di Casa", "Burger Hunters", "I Senza Fretta", "Le Sirene del Po", "Ciurma del Divano", "I Naviganti", "Gli Ultimi Pirati", "La Compagnia del Gnocco", "I Vincitori Morali", "Le Leggende della Domenica"],
};

const fallbackWins: Record<"friday" | "saturday" | "sunday", number[]> = {
  friday: [6, 5, 5, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  saturday: [5, 4, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  sunday: [4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("tortuga_winners")
    .select("id,team_name,evening,created_at")
    .order("created_at", { ascending: false })
    .limit(90);

  if (error) {
    console.error("Tortuga winners read error:", error);
    return NextResponse.json({ error: "Vincitori non disponibili." }, { status: 500 });
  }

  const grouped = new Map<string, { id: string; team_name: string; evening: "friday" | "saturday" | "sunday"; created_at: string; wins: number }>();
  for (const winner of data ?? []) {
    const evening = winner.evening as "friday" | "saturday" | "sunday";
    const key = `${evening}:${winner.team_name.trim().toLocaleLowerCase("it")}`;
    const current = grouped.get(key);
    if (current) {
      current.wins += 1;
      if (winner.created_at > current.created_at) current.created_at = winner.created_at;
    } else {
      grouped.set(key, { ...winner, evening, wins: 1 });
    }
  }
  const winners = [...grouped.values()].sort((left, right) => right.wins - left.wins || left.team_name.localeCompare(right.team_name, "it"));
  const mockWinners = (Object.entries(fallbackTeams) as ["friday" | "saturday" | "sunday", string[]][]).flatMap(([evening, teams]) => {
    const realCount = winners.filter((winner) => winner.evening === evening).length;
    return teams.slice(0, Math.max(0, 30 - realCount)).map((team_name, index) => ({
      id: `mock-${evening}-${index + 1}`,
      team_name,
      evening,
      created_at: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
      wins: fallbackWins[evening][index] ?? 1,
      is_mock: true,
    }));
  });
  return NextResponse.json({ winners: [...winners, ...mockWinners].sort((left, right) => right.wins - left.wins || left.team_name.localeCompare(right.team_name, "it")) });
}
