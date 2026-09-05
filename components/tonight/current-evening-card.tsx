/* eslint-disable @next/next/no-img-element */
import type { LiveGameId } from "@/lib/live-game";
import { tortugaInfoConfig } from "@/lib/config";
import { LiveGameCard } from "@/components/live-game-card";

type Program = (typeof tortugaInfoConfig.eveningProgram)[number];

export function CurrentEveningCard({
  program,
  upcoming,
  activeGame,
  showPending,
}: {
  program: Program;
  upcoming: boolean;
  activeGame: LiveGameId | null;
  showPending: boolean;
}) {
  return (
    <section className="tonight-current-program">
      <article className="evening-program-card">
        <div className="evening-program-image">
          <img src={program.imageUrl} alt={program.title} />
        </div>
        <div className="evening-program-copy">
          <p>{upcoming ? `Prossima serata · ${program.day}` : program.day}</p>
          <h3>{program.title}</h3>
          <span>{program.description}</span>
          {activeGame ? (
            <LiveGameCard activeGameProp={activeGame} />
          ) : showPending ? (
            <p className="tonight-game-pending">
              Quando sarà il momento qui appariranno le istruzioni per poter giocare. Si consiglia di fare più squadre possibili per aumentare le possibilità di vittoria.
            </p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
