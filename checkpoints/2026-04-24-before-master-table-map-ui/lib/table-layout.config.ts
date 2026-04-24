export type TableRef = string;

export type TableNode = {
  id: TableRef;
  label: string;
  minPax: number;
  maxPax: number;
  roomCode: string;
  roomName: string;
  type: "single" | "combo";
  members: string[];
};

export type RoomLayoutConfig = {
  roomCode: string;
  roomName: string;
  publicName: string;
  mapImage?: string;
  tables: TableNode[];
};

export type TableMapAnchor = {
  x: number;
  y: number;
  size?: "sm" | "md" | "lg";
};

export type RoomMapZone = {
  label: string;
  x: number;
  y: number;
  width: number;
};

export type RoomMapVisualConfig = {
  roomCode: string;
  roomName: string;
  aspectRatio: number;
  anchors: Record<TableRef, TableMapAnchor>;
  zones?: RoomMapZone[];
};

export const TORTUGA_TABLE_LAYOUTS: RoomLayoutConfig[] = [
  {
    roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8",
    roomName: "Sala Centrale",
    publicName: "Sala Centrale",
    mapImage: "/maps/sala-centrale.png",
    tables: [
      { id: "20", label: "Tavolo 20", minPax: 2, maxPax: 4, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "single", members: ["20"] },
      { id: "21", label: "Tavolo 21", minPax: 3, maxPax: 6, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "single", members: ["21"] },
      { id: "22", label: "Tavolo 22", minPax: 2, maxPax: 4, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "single", members: ["22"] },
      { id: "23", label: "Tavolo 23", minPax: 3, maxPax: 6, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "single", members: ["23"] },
      { id: "24", label: "Tavolo 24", minPax: 2, maxPax: 4, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "single", members: ["24"] },
      { id: "25", label: "Tavolo 25", minPax: 2, maxPax: 4, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "single", members: ["25"] },
      { id: "26", label: "Tavolo 26", minPax: 2, maxPax: 4, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "single", members: ["26"] },
      { id: "27", label: "Tavolo 27", minPax: 2, maxPax: 4, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "single", members: ["27"] },
      { id: "28", label: "Tavolo 28", minPax: 2, maxPax: 4, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "single", members: ["28"] },
      { id: "29", label: "Tavolo 29", minPax: 2, maxPax: 4, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "single", members: ["29"] },
      { id: "25-28", label: "Tavoli 25 + 28", minPax: 5, maxPax: 8, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "combo", members: ["25", "28"] },
      { id: "26-29", label: "Tavoli 26 + 29", minPax: 5, maxPax: 8, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "combo", members: ["26", "29"] },
      { id: "25-27", label: "Tavoli 25 + 27", minPax: 5, maxPax: 8, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "combo", members: ["25", "27"] },
      { id: "20-21", label: "Tavoli 20 + 21", minPax: 5, maxPax: 9, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "combo", members: ["20", "21"] },
      { id: "22-23", label: "Tavoli 22 + 23", minPax: 5, maxPax: 9, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "combo", members: ["22", "23"] },
      { id: "27-28-29", label: "Tavoli 27 + 28 + 29", minPax: 10, maxPax: 15, roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", roomName: "Sala Centrale", type: "combo", members: ["27", "28", "29"] },
    ],
  },
  {
    roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce",
    roomName: "Soppalco",
    publicName: "Soppalco",
    mapImage: "/maps/soppalco.png",
    tables: [
      { id: "30", label: "Tavolo 30", minPax: 1, maxPax: 2, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "single", members: ["30"] },
      { id: "31", label: "Tavolo 31", minPax: 1, maxPax: 2, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "single", members: ["31"] },
      { id: "32", label: "Tavolo 32", minPax: 1, maxPax: 2, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "single", members: ["32"] },
      { id: "33", label: "Tavolo 33", minPax: 1, maxPax: 2, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "single", members: ["33"] },
      { id: "34", label: "Tavolo 34", minPax: 1, maxPax: 2, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "single", members: ["34"] },
      { id: "35", label: "Tavolo 35", minPax: 1, maxPax: 2, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "single", members: ["35"] },
      { id: "36", label: "Tavolo 36", minPax: 2, maxPax: 4, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "single", members: ["36"] },
      { id: "37", label: "Tavolo 37", minPax: 5, maxPax: 7, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "single", members: ["37"] },
      { id: "38", label: "Tavolo 38", minPax: 5, maxPax: 7, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "single", members: ["38"] },
      { id: "30-31", label: "Tavoli 30 + 31", minPax: 3, maxPax: 4, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "combo", members: ["30", "31"] },
      { id: "32-33", label: "Tavoli 32 + 33", minPax: 3, maxPax: 4, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "combo", members: ["32", "33"] },
      { id: "34-35", label: "Tavoli 34 + 35", minPax: 3, maxPax: 4, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "combo", members: ["34", "35"] },
      { id: "36-37", label: "Tavoli 36 + 37", minPax: 8, maxPax: 8, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "combo", members: ["36", "37"] },
      { id: "37-38", label: "Tavoli 37 + 38", minPax: 10, maxPax: 12, roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", roomName: "Soppalco", type: "combo", members: ["37", "38"] },
    ],
  },
  {
    roomCode: "32986b6b-4f7f-4924-a9de-c76445e1031e",
    roomName: "Galeone",
    publicName: "Cabina di Poppa",
    mapImage: "/maps/galeone.png",
    tables: [
      { id: "10", label: "Tavolo 10", minPax: 4, maxPax: 8, roomCode: "32986b6b-4f7f-4924-a9de-c76445e1031e", roomName: "Galeone", type: "single", members: ["10"] },
      { id: "11", label: "Tavolo 11", minPax: 4, maxPax: 8, roomCode: "32986b6b-4f7f-4924-a9de-c76445e1031e", roomName: "Galeone", type: "single", members: ["11"] },
      { id: "12", label: "Tavolo 12", minPax: 4, maxPax: 8, roomCode: "32986b6b-4f7f-4924-a9de-c76445e1031e", roomName: "Galeone", type: "single", members: ["12"] },
      { id: "10-11", label: "Tavoli 10 + 11", minPax: 9, maxPax: 14, roomCode: "32986b6b-4f7f-4924-a9de-c76445e1031e", roomName: "Galeone", type: "combo", members: ["10", "11"] },
      { id: "11-12", label: "Tavoli 11 + 12", minPax: 9, maxPax: 14, roomCode: "32986b6b-4f7f-4924-a9de-c76445e1031e", roomName: "Galeone", type: "combo", members: ["11", "12"] },
      { id: "10-11-12", label: "Tavoli 10 + 11 + 12", minPax: 15, maxPax: 20, roomCode: "32986b6b-4f7f-4924-a9de-c76445e1031e", roomName: "Galeone", type: "combo", members: ["10", "11", "12"] },
    ],
  },
  {
    roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c",
    roomName: "Area Family",
    publicName: "Area Family",
    mapImage: "/maps/area-family.png",
    tables: [
      { id: "13", label: "Tavolo 13", minPax: 6, maxPax: 8, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "single", members: ["13"] },
      { id: "14", label: "Tavolo 14", minPax: 6, maxPax: 8, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "single", members: ["14"] },
      { id: "15", label: "Tavolo 15", minPax: 6, maxPax: 8, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "single", members: ["15"] },
      { id: "16", label: "Tavolo 16", minPax: 6, maxPax: 8, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "single", members: ["16"] },
      { id: "17", label: "Tavolo 17", minPax: 6, maxPax: 8, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "single", members: ["17"] },
      { id: "40", label: "Tavolo 40", minPax: 2, maxPax: 6, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "single", members: ["40"] },
      { id: "41", label: "Tavolo 41", minPax: 2, maxPax: 6, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "single", members: ["41"] },
      { id: "42", label: "Tavolo 42", minPax: 2, maxPax: 6, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "single", members: ["42"] },
      { id: "43", label: "Tavolo 43", minPax: 2, maxPax: 6, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "single", members: ["43"] },
      { id: "50", label: "Tavolo 50", minPax: 5, maxPax: 8, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "single", members: ["50"] },
      { id: "51", label: "Tavolo 51", minPax: 2, maxPax: 3, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "single", members: ["51"] },
      { id: "60", label: "Tavolo 60", minPax: 3, maxPax: 4, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "single", members: ["60"] },
      { id: "50-51", label: "Tavoli 50 + 51", minPax: 6, maxPax: 8, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "combo", members: ["50", "51"] },
      { id: "40-41", label: "Tavoli 40 + 41", minPax: 7, maxPax: 10, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "combo", members: ["40", "41"] },
      { id: "41-42", label: "Tavoli 41 + 42", minPax: 7, maxPax: 10, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "combo", members: ["41", "42"] },
      { id: "42-43", label: "Tavoli 42 + 43", minPax: 7, maxPax: 10, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "combo", members: ["42", "43"] },
      { id: "40-41-42", label: "Tavoli 40 + 41 + 42", minPax: 11, maxPax: 14, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "combo", members: ["40", "41", "42"] },
      { id: "41-42-43", label: "Tavoli 41 + 42 + 43", minPax: 11, maxPax: 14, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "combo", members: ["41", "42", "43"] },
      { id: "16-17", label: "Tavoli 16 + 17", minPax: 12, maxPax: 16, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "combo", members: ["16", "17"] },
      { id: "14-15", label: "Tavoli 14 + 15", minPax: 12, maxPax: 16, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "combo", members: ["14", "15"] },
      { id: "13-14", label: "Tavoli 13 + 14", minPax: 12, maxPax: 16, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "combo", members: ["13", "14"] },
      { id: "13-14-15", label: "Tavoli 13 + 14 + 15", minPax: 18, maxPax: 24, roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", roomName: "Area Family", type: "combo", members: ["13", "14", "15"] },
    ],
  },
];

export const TORTUGA_TABLE_MAP_VISUALS: RoomMapVisualConfig[] = [
  {
    roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8",
    roomName: "Sala Centrale",
    aspectRatio: 1.08,
    anchors: {
      "20": { x: 16, y: 22, size: "md" },
      "21": { x: 36, y: 22, size: "lg" },
      "22": { x: 16, y: 47, size: "md" },
      "23": { x: 36, y: 47, size: "lg" },
      "24": { x: 67, y: 18, size: "md" },
      "25": { x: 59, y: 39, size: "md" },
      "26": { x: 77, y: 37, size: "md" },
      "27": { x: 57, y: 63, size: "md" },
      "28": { x: 75, y: 61, size: "md" },
      "29": { x: 90, y: 59, size: "md" },
    },
    zones: [
      { label: "Ingresso", x: 14, y: 88, width: 24 },
      { label: "Cuore della sala", x: 38, y: 10, width: 34 },
      { label: "Bancone", x: 78, y: 10, width: 22 },
    ],
  },
  {
    roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce",
    roomName: "Soppalco",
    aspectRatio: 1.08,
    anchors: {
      "30": { x: 18, y: 20, size: "sm" },
      "31": { x: 36, y: 20, size: "sm" },
      "32": { x: 18, y: 43, size: "sm" },
      "33": { x: 36, y: 43, size: "sm" },
      "34": { x: 18, y: 67, size: "sm" },
      "35": { x: 36, y: 67, size: "sm" },
      "36": { x: 64, y: 34, size: "md" },
      "37": { x: 82, y: 27, size: "lg" },
      "38": { x: 82, y: 62, size: "lg" },
    },
    zones: [
      { label: "Ringhiera", x: 32, y: 8, width: 36 },
      { label: "Vista sulla sala", x: 74, y: 82, width: 30 },
    ],
  },
  {
    roomCode: "32986b6b-4f7f-4924-a9de-c76445e1031e",
    roomName: "Galeone",
    aspectRatio: 1.12,
    anchors: {
      "10": { x: 20, y: 56, size: "lg" },
      "11": { x: 50, y: 44, size: "lg" },
      "12": { x: 80, y: 56, size: "lg" },
    },
    zones: [
      { label: "Cabina", x: 50, y: 10, width: 30 },
      { label: "Passaggio", x: 50, y: 86, width: 28 },
    ],
  },
  {
    roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c",
    roomName: "Area Family",
    aspectRatio: 1.14,
    anchors: {
      "13": { x: 12, y: 18, size: "lg" },
      "14": { x: 28, y: 18, size: "lg" },
      "15": { x: 44, y: 18, size: "lg" },
      "16": { x: 60, y: 18, size: "lg" },
      "17": { x: 76, y: 18, size: "lg" },
      "40": { x: 18, y: 56, size: "md" },
      "41": { x: 36, y: 56, size: "md" },
      "42": { x: 54, y: 56, size: "md" },
      "43": { x: 72, y: 56, size: "md" },
      "50": { x: 18, y: 80, size: "lg" },
      "51": { x: 36, y: 80, size: "sm" },
      "60": { x: 58, y: 80, size: "md" },
    },
    zones: [
      { label: "Area family", x: 50, y: 10, width: 34 },
      { label: "Zona centrale", x: 50, y: 40, width: 32 },
      { label: "Tavoli bassi", x: 28, y: 92, width: 28 },
    ],
  },
];

export function findRoomLayout(roomCode: string) {
  return TORTUGA_TABLE_LAYOUTS.find((room) => room.roomCode === roomCode);
}

export function getCompatibleTableOptions(roomCode: string, pax: number) {
  const room = findRoomLayout(roomCode);
  if (!room) return [];
  return room.tables.filter((table) => pax >= table.minPax && pax <= table.maxPax);
}
