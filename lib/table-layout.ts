import {
  findRoomLayout,
  getCompatibleTableOptions,
  TORTUGA_TABLE_LAYOUTS,
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

export const getCompatibleTableOptionsAcrossRooms = (pax: number): TableNode[] =>
  TORTUGA_TABLE_LAYOUTS.flatMap((room) =>
    getCompatibleTableOptions(room.roomCode, pax),
  );

export const getCompatibleSingleTablesAcrossRooms = (pax: number): TableNode[] =>
  getCompatibleTableOptionsAcrossRooms(pax).filter((table) => table.type === "single");

export const getCompatibleTableCombosAcrossRooms = (pax: number): TableNode[] =>
  getCompatibleTableOptionsAcrossRooms(pax).filter((table) => table.type === "combo");

export const getSelectableSingleTableIdsAcrossRooms = (pax: number): string[] => {
  const compatibleSingles = getCompatibleSingleTablesAcrossRooms(pax).map(
    (table) => table.id,
  );
  const comboMemberIds = getCompatibleTableCombosAcrossRooms(pax).flatMap(
    (table) => table.members,
  );

  return Array.from(new Set([...compatibleSingles, ...comboMemberIds]));
};

export const resolveTableSelectionByAnchor = (
  tableId: string,
  pax: number,
): TableNode | null => {
  const compatibleSingle = getCompatibleSingleTablesAcrossRooms(pax).find(
    (table) => table.id === tableId,
  );

  if (compatibleSingle) {
    return compatibleSingle;
  }

  const compatibleCombo = getCompatibleTableCombosAcrossRooms(pax)
    .filter((table) => table.members.includes(tableId))
    .sort((left, right) => {
      if (left.members.length !== right.members.length) {
        return left.members.length - right.members.length;
      }

      const leftSlack = left.maxPax - pax;
      const rightSlack = right.maxPax - pax;
      return leftSlack - rightSlack;
    })[0];

  return compatibleCombo ?? null;
};

export const getTableOptionByIdAcrossRooms = (tableId?: string): TableNode | null => {
  if (!tableId) {
    return null;
  }

  for (const room of TORTUGA_TABLE_LAYOUTS) {
    const table = room.tables.find((candidate) => candidate.id === tableId);
    if (table) {
      return table;
    }
  }

  return null;
};

export const buildTablePreferenceSummary = (table: TableNode | null) => {
  if (!table) {
    return "";
  }

  const publicRoomName = findRoomLayout(table.roomCode)?.publicName ?? table.roomName;
  return `Preferenza in ${publicRoomName} per ${table.minPax}-${table.maxPax} persone`;
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
