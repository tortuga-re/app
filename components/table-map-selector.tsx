"use client";

import { TortugaMasterTableMap } from "@/components/tortuga-master-table-map";
import { cn } from "@/lib/utils";
import { findRoomLayout } from "@/lib/table-layout.config";
import {
  buildTablePreferenceSummary,
  getSelectableSingleTableIdsAcrossRooms,
  getTableOptionByIdAcrossRooms,
  resolveTableSelectionByAnchor,
} from "@/lib/table-layout";

type TableMapSelectorProps = {
  roomCode: string;
  pax: number;
  selectedTableId: string;
  selectionEnabled: boolean;
  onSelect: (tableId: string) => void;
  onClear: () => void;
};

const legendItems = [
  {
    label: "Compatibile con la richiesta",
    className: "border-[rgba(53,40,25,0.52)] bg-[#f7f4ec]",
  },
  {
    label: "Non compatibile",
    className: "border-[rgba(110,72,32,0.64)] bg-[rgba(207,164,88,0.82)]",
  },
  {
    label: "Preferenza scelta",
    className: "border-[rgba(158,105,50,0.9)] bg-[#fff3d9] shadow-[0_0_0_2px_rgba(255,233,184,0.18)]",
  },
] as const;

export function TableMapSelector({
  roomCode,
  pax,
  selectedTableId,
  selectionEnabled,
  onSelect,
  onClear,
}: TableMapSelectorProps) {
  const roomLayout = findRoomLayout(roomCode);

  if (!roomLayout) {
    return null;
  }

  const selectableSingleIds = selectionEnabled
    ? getSelectableSingleTableIdsAcrossRooms(pax)
    : [];
  const selectedOption = getTableOptionByIdAcrossRooms(selectedTableId);
  const selectedComboMembers =
    selectedOption?.type === "combo" ? selectedOption.members : [];
  const handleSelectTable = (tableId: string) => {
    const resolvedOption = resolveTableSelectionByAnchor(tableId, pax);

    if (!resolvedOption) {
      return;
    }

    onSelect(resolvedOption.id);
  };

  return (
    <div className="panel rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Preferenza Tavolo</p>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            La mappa mostra tutto il Tortuga in un&apos;unica piantina. Tocca un
            tavolo per indicarci dove preferisci essere accomodato: se per il tuo
            gruppo servono piu tavoli, la composizione viene completata in
            automatico sullo sfondo. La mappa non riflette l&apos;occupazione
            tavolo in tempo reale: resta una preferenza da confermare con il
            locale.
          </p>
        </div>

        {selectedOption ? (
          <button
            type="button"
            className="text-[10px] font-medium uppercase tracking-[0.16em] text-[rgba(242,215,165,0.72)]"
            onClick={onClear}
          >
            Rimuovi
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[rgba(255,216,156,0.14)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Area attiva
        </span>
        <span className="rounded-full border border-[rgba(255,216,156,0.12)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-sm font-medium text-white">
          {roomLayout.publicName}
        </span>
        <span className="rounded-full border border-[rgba(255,216,156,0.12)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-sm font-medium text-white">
          {pax} persone
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <TortugaMasterTableMap
          roomCode={roomCode}
          compatibleTableIds={selectableSingleIds}
          selectedTableId={selectedTableId}
          selectedComboMemberIds={selectedComboMembers}
          onSelectTable={handleSelectTable}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {legendItems.map((item) => (
            <div
              key={item.label}
              className="rounded-[1.25rem] border border-[rgba(255,216,156,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-3"
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-[0.8rem] border",
                  item.className,
                )}
              />
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-[rgba(242,215,165,0.72)]">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-[1.4rem] border border-[rgba(255,216,156,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Riepilogo preferenza</p>
            {!selectedOption ? (
              <span className="text-[10px] uppercase tracking-[0.18em] text-[rgba(242,215,165,0.7)]">
                Opzionale
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {selectedOption
              ? buildTablePreferenceSummary(selectedOption)
              : selectionEnabled
                ? "Tocca un tavolo chiaro sulla mappa per esprimere la tua preferenza."
                : "Scegli prima uno slot orario per attivare la preferenza tavolo sulla mappa."}
          </p>
        </div>
      </div>
    </div>
  );
}
