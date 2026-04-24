import {
  findRoomLayout,
  getCompatibleTableOptions,
  TORTUGA_TABLE_MAP_VISUALS,
  type RoomMapVisualConfig,
  type TableNode,
} from "@/lib/table-layout.config";

export { getCompatibleTableOptions } from "@/lib/table-layout.config";

export const getRoomMapVisual = (roomCode: string): RoomMapVisualConfig | undefined =>
  TORTUGA_TABLE_MAP_VISUALS.find((room) => room.roomCode === roomCode);

export const getTableOptionById = (roomCode: string, tableId?: string): TableNode | null => {
  if (!tableId) {
    return null;
  }

  const room = findRoomLayout(roomCode);
  if (!room) {
    return null;
  }

  return room.tables.find((table) => table.id === tableId) ?? null;
};

export const getCompatibleSingleTables = (roomCode: string, pax: number): TableNode[] =>
  getCompatibleTableOptions(roomCode, pax).filter((table) => table.type === "single");

export const getCompatibleTableCombos = (roomCode: string, pax: number): TableNode[] =>
  getCompatibleTableOptions(roomCode, pax).filter((table) => table.type === "combo");

export const buildTablePreferenceSummary = (table: TableNode | null) => {
  if (!table) {
    return "";
  }

  if (table.type === "combo") {
    return `${table.label} - configurazione tavolo`;
  }

  return `${table.label} - tavolo singolo`;
};

export const buildTablePreferenceNote = (
  customerNote: string | undefined,
  table: TableNode | null,
) => {
  const trimmedCustomerNote = customerNote?.trim() ?? "";

  if (!table) {
    return trimmedCustomerNote || undefined;
  }

  const lines = [
    `Preferenza tavolo da web app Tortuga: ${table.label}.`,
    `Sala preferita: ${table.roomName}.`,
    table.type === "combo"
      ? `Configurazione richiesta: ${table.members.join(" + ")}.`
      : `Tavolo richiesto: ${table.members[0]}.`,
  ];

  if (!trimmedCustomerNote) {
    return lines.join("\n");
  }

  return [...lines, "", trimmedCustomerNote].join("\n");
};
