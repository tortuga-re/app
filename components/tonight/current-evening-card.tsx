/* eslint-disable @next/next/no-img-element */
import { ChevronRight, KeyRound, Wifi } from "lucide-react";

import { liveGames, type LiveGameId } from "@/lib/live-game";
import { tortugaInfoConfig } from "@/lib/config";

type Program = (typeof tortugaInfoConfig.eveningProgram)[number];

export function CurrentEveningCard({ program, upcoming, activeGame, showPending }: { program: Program; upcoming: boolean; activeGame: LiveGameId | null; showPending: boolean }) {
  return <section className="tonight-current-program"><article className="evening-program-card"><div className="evening-program-image"><img src={program.imageUrl} alt={program.title} /></div><div className="evening-program-copy"><p>{upcoming ? `Prossima serata · ${program.day}` : program.day}</p><h3>{program.title}</h3><span>{program.description}</span>{activeGame ? <div className="game-context-card"><div className="game-context-heading"><div><p className="minimal-eyebrow">Come giocare</p><span>I passaggi vanno eseguiti in ordine</span></div></div><p className="game-wifi-label">COLLEGATI AL WI-FI</p><div className="game-wifi-row"><span><Wifi aria-hidden="true" />TORTUGA</span><span><KeyRound aria-hidden="true" />PERLANERA</span></div><a href={liveGames[activeGame].url} target="_blank" rel="noreferrer">POI CLICCA QUI <ChevronRight /></a></div> : showPending ? <p className="tonight-game-pending">Quando sarà il momento qui appariranno le istruzioni per poter giocare. Si consiglia di fare più squadre possibili per aumentare le possibilità di vittoria.</p> : null}</div></article></section>;
}
