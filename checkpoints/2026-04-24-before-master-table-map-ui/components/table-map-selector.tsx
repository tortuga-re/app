"use client";

import { cn } from "@/lib/utils";
import {
  findRoomLayout,
  type TableNode,
} from "@/lib/table-layout.config";
import {
  buildTablePreferenceSummary,
  getCompatibleSingleTables,
  getCompatibleTableCombos,
  getRoomMapVisual,
} from "@/lib/table-layout";

type TableMapSelectorProps = {
  roomCode: string;
  pax: number;
  selectedTableId: string;
  onSelect: (tableId: string) => void;
  onClear: () => void;
};

const TABLE_SIZE_CLASSES = {
  sm: "h-12 min-w-12 px-2",
  md: "h-14 min-w-14 px-2.5",
  lg: "h-16 min-w-16 px-3",
} as const;

export function TableMapSelector({
  roomCode,
  pax,
  selectedTableId,
  onSelect,
  onClear,
}: TableMapSelectorProps) {
  const roomLayout = findRoomLayout(roomCode);
  const mapVisual = getRoomMapVisual(roomCode);

  if (!roomLayout || !mapVisual) {
    return null;
  }

  const compatibleSingles = getCompatibleSingleTables(roomCode, pax);
  const compatibleCombos = getCompatibleTableCombos(roomCode, pax);
  const compatibleSingleIds = new Set(compatibleSingles.map((table) => table.id));
  const selectedSingle = compatibleSingles.find((table) => table.id === selectedTableId) ?? null;
  const selectedCombo = compatibleCombos.find((table) => table.id === selectedTableId) ?? null;
  const selectedOption = selectedSingle ?? selectedCombo ?? null;
  const selectedMembers = new Set(selectedOption?.members ?? []);
  const singleTables = roomLayout.tables.filter((table) => table.type === "single");

  const getSingleState = (table: TableNode) => {
    const isCompatible = compatibleSingleIds.has(table.id);
    const isSelected = selectedTableId === table.id;
    const isComboMember = selectedCombo ? selectedMembers.has(table.id) : false;

    return { isCompatible, isSelected, isComboMember };
  };

  return (
    <div className="panel rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Preferenza Tavolo</p>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Scegli la tua zona preferita in {roomLayout.publicName}. La scelta del
            tavolo e una preferenza e sara confermata in base alla disponibilita.
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

      <div className="mt-4 overflow-hidden rounded-[1.7rem] border border-[rgba(255,216,156,0.12)] bg-[linear-gradient(180deg,rgba(42,31,22,0.96),rgba(18,12,8,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div
          className="relative w-full overflow-hidden rounded-[1.45rem] border border-[rgba(255,216,156,0.08)] bg-[radial-gradient(circle_at_top,rgba(255,216,156,0.08),transparent_34%),linear-gradient(160deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]"
          style={{ aspectRatio: String(mapVisual.aspectRatio) }}
        >
          <div className="absolute inset-x-4 top-4 h-12 rounded-full border border-[rgba(255,216,156,0.08)] bg-[rgba(255,255,255,0.03)]" />
          <div className="absolute inset-x-6 bottom-4 h-10 rounded-full border border-dashed border-[rgba(255,216,156,0.08)] bg-[rgba(255,255,255,0.02)]" />

          {mapVisual.zones?.map((zone) => (
            <div
              key={zone.label}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(255,216,156,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[rgba(242,215,165,0.64)]"
              style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%` }}
            >
              <span className="block truncate text-center">{zone.label}</span>
            </div>
          ))}

          {singleTables.map((table) => {
            const anchor = mapVisual.anchors[table.id];
            if (!anchor) {
              return null;
            }

            const { isCompatible, isSelected, isComboMember } = getSingleState(table);
            const sizeClass = TABLE_SIZE_CLASSES[anchor.size ?? "md"];

            return (
              <button
                key={table.id}
                type="button"
                disabled={!isCompatible}
                aria-pressed={isSelected}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-[1.1rem] border text-center text-xs font-semibold text-white transition duration-200",
                  sizeClass,
                  isCompatible
                    ? "border-[rgba(255,216,156,0.24)] bg-[rgba(31,23,16,0.92)] shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                    : "border-[rgba(255,255,255,0.06)] bg-[rgba(17,12,9,0.72)] text-[rgba(255,255,255,0.28)] opacity-45",
                  (isSelected || isComboMember) &&
                    "border-[rgba(242,215,165,0.58)] bg-[linear-gradient(180deg,rgba(181,138,77,0.36),rgba(28,20,13,0.98))] text-[#fff5e3] shadow-[0_0_0_2px_rgba(242,215,165,0.12),0_16px_30px_rgba(0,0,0,0.24)]",
                )}
                style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
                onClick={() => onSelect(table.id)}
                title={`${table.label} · ${table.minPax}-${table.maxPax} persone`}
              >
                {table.members[0]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-[1.4rem] border border-[rgba(255,216,156,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
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
            : "Puoi lasciare il flusso invariato oppure indicare un tavolo o una configurazione preferita."}
        </p>
      </div>

      {compatibleCombos.length > 0 ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">
              Configurazioni compatibili
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Selezionandole, la mappa evidenzia i tavoli coinvolti.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {compatibleCombos.map((combo) => {
              const isSelected = selectedTableId === combo.id;
              return (
                <button
                  key={combo.id}
                  type="button"
                  className={cn(
                    "panel-muted rounded-[1.35rem] px-4 py-4 text-left transition",
                    isSelected && "border border-[var(--border-strong)] bg-white/8",
                  )}
                  onClick={() => onSelect(combo.id)}
                >
                  <p className="text-sm font-semibold text-white">{combo.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                    Tavoli {combo.members.join(" + ")} · {combo.minPax}-{combo.maxPax} persone
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
