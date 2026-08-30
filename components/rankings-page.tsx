"use client";

import { Crown, Trophy, UtensilsCrossed } from "lucide-react";
import { useEffect, useState } from "react";

type Evening = "friday" | "saturday" | "sunday";
type Winner = { id: string; team_name: string; evening: Evening; wins: number };
type Legend = { nickname: string; legend_number: number; real_name?: string };
type FoodCategory = { id: string; label: string; items: { position: number; name: string; quantity: number }[] };
const eveningLabels: Record<Evening, string> = { friday: "Venerdi", saturday: "Sabato", sunday: "Domenica" };

export function RankingsPage() {
  const [evening, setEvening] = useState<Evening>("friday");
  const [winners, setWinners] = useState<Winner[]>([]);
  const [legends, setLegends] = useState<Legend[]>([]);
  const [foodCategories, setFoodCategories] = useState<FoodCategory[]>([]);
  const [foodTab, setFoodTab] = useState("antipasti");

  useEffect(() => {
    void Promise.all([
      fetch("/api/tortuga-winners").then((response) => response.ok ? response.json() : null),
      fetch("/api/profile/legends").then((response) => response.ok ? response.json() : null),
      fetch("/api/classifiche").then((response) => response.ok ? response.json() : null),
    ]).then(([winnerData, legendData, foodData]) => {
      setWinners(winnerData?.winners ?? []);
      setLegends(legendData?.legends ?? []);
      const categories = foodData?.categories ?? [];
      setFoodCategories(categories);
      if (categories[0]?.id) setFoodTab(categories[0].id);
    });
  }, []);

  const selectedWinners = winners.filter((winner) => winner.evening === evening);
  const selectedFood = foodCategories.find((category) => category.id === foodTab);
  return <main className="minimal-page rankings-page pb-28"><div className="minimal-overlap-sheet rankings-sheet"><header className="overlap-sheet-intro"><p className="minimal-eyebrow">La plancia della ciurma</p><h1>Classifiche</h1><p>Le squadre, le Leggende e i piatti che hanno conquistato il Tortuga.</p></header><div className="space-y-6">
    <section><div className="mt-1 grid grid-cols-3 gap-2">{(Object.keys(eveningLabels) as Evening[]).map((key) => <button key={key} type="button" onClick={() => setEvening(key)} className={evening === key ? "minimal-primary py-2 text-xs" : "profile-edit-trigger py-2 text-xs"}>{eveningLabels[key]}</button>)}</div><LeaderboardPanel icon={<Trophy size={15} />} title="Vincitori del Tortuga" subtitle="Le squadre con più serate conquistate"><LeaderboardRows items={selectedWinners.slice(0, 30).map((winner, index) => ({ id: winner.id, position: index + 1, name: winner.team_name, value: `${winner.wins} ${winner.wins === 1 ? "vittoria" : "vittorie"}` }))} empty="La prossima squadra vincitrice sara qui." /></LeaderboardPanel></section>
    <LeaderboardPanel icon={<Crown size={15} />} title="Hall of Legends" subtitle="Il registro storico dei pirati leggendari del Tortuga che hanno superato 100 dobloni"><LeaderboardRows items={legends.map((legend, index) => ({ id: `${legend.nickname}-${legend.legend_number}`, position: legend.legend_number || index + 1, name: legend.nickname, value: legend.real_name ?? "" }))} empty="Nessun pirata ha ancora inciso il proprio nome nella storia..." /></LeaderboardPanel>
    <section><div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">{foodCategories.map((category) => <button key={category.id} type="button" onClick={() => setFoodTab(category.id)} className={foodTab === category.id ? "minimal-primary py-2 text-xs" : "profile-edit-trigger py-2 text-xs"}>{category.label}</button>)}</div><LeaderboardPanel icon={<UtensilsCrossed size={15} />} title="Classifica piatti" subtitle="Classifica piatti degli ultimi 7 giorni"><LeaderboardRows items={(selectedFood?.items ?? []).map((item) => ({ id: `${item.position}-${item.name}`, position: item.position, name: item.name, value: String(item.quantity) }))} empty="La classifica si aggiornera con le prossime comande." /></LeaderboardPanel></section>
  </div></div></main>;
}

function LeaderboardPanel({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="hall-of-legends mt-4 space-y-4 rounded-[1.55rem] border border-[rgba(197,154,71,0.45)] bg-[#fffdf8] p-5"><div className="space-y-1.5 border-b border-[rgba(197,154,71,0.15)] pb-2.5 text-center"><h2 className="flex items-center justify-center gap-1.5 text-sm font-black uppercase tracking-[0.25em] text-[var(--accent)]">{icon} {title}</h2><p className="text-[10px] leading-relaxed text-[var(--text-muted)]">{subtitle}</p></div>{children}</div>;
}

function LeaderboardRows({ items, empty }: { items: { id: string; position: number; name: string; value: string }[]; empty: string }) {
  return items.length ? <div className="custom-scrollbar max-h-[320px] space-y-2 overflow-y-auto pr-1">{items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-[0.8rem] border border-[rgba(197,154,71,0.12)] bg-[#f0e9de] px-4 py-2.5 transition-all duration-200 hover:border-[rgba(197,154,71,0.35)]"><div className="flex min-w-0 items-center gap-3"><div className="flex h-7 w-12 shrink-0 items-center justify-center rounded-lg border border-[rgba(197,154,71,0.35)] bg-[#fffdf8] font-mono text-[10px] font-black text-[var(--accent)]">#{String(item.position).padStart(4, "0")}</div><span className="truncate text-xs font-black text-black">{item.name}</span></div>{item.value ? <span className="ml-3 shrink-0 rounded-full border border-[rgba(197,154,71,0.2)] bg-[#fffdf8] px-2.5 py-1 font-sans text-[10px] font-bold text-[var(--text-muted)]">{item.value}</span> : null}</div>)}</div> : <p className="py-6 text-center text-[10px] italic text-[var(--text-muted)]">{empty}</p>;
}
