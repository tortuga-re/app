import type { TableRef } from "@/lib/table-layout.config";

export type MasterRoomRegion = {
  roomCode: string;
  publicName: string;
  polygon: string;
  badgeX: number;
  badgeY: number;
};

export type MasterTableVisual = {
  tableId: TableRef;
  roomCode: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export const TORTUGA_MASTER_TABLE_MAP = {
  width: 1448,
  height: 1086,
  imagePath: "/maps/tortuga-master-map.png",
  roomRegions: [
    {
      roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8",
      publicName: "Sala Centrale",
      polygon:
        "34,235 536,235 536,605 462,605 462,785 34,785",
      badgeX: 252,
      badgeY: 575,
    },
    {
      roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce",
      publicName: "Soppalco",
      polygon:
        "34,18 778,18 778,374 536,374 536,235 34,235",
      badgeX: 648,
      badgeY: 174,
    },
    {
      roomCode: "32986b6b-4f7f-4924-a9de-c76445e1031e",
      publicName: "Cabina di Poppa",
      polygon:
        "150,834 680,834 680,1083 150,1083",
      badgeX: 418,
      badgeY: 940,
    },
    {
      roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c",
      publicName: "Area Family",
      polygon:
        "535,372 971,372 1265,669 1265,832 1446,832 1446,1083 680,1083 680,834 535,834",
      badgeX: 884,
      badgeY: 612,
    },
  ] satisfies MasterRoomRegion[],
  tables: [
    { tableId: "31", roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", x: 146, y: 69, width: 56, height: 56 },
    { tableId: "33", roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", x: 258, y: 69, width: 56, height: 56 },
    { tableId: "35", roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", x: 356, y: 69, width: 56, height: 56 },
    { tableId: "30", roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", x: 144, y: 152, width: 56, height: 56 },
    { tableId: "32", roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", x: 258, y: 152, width: 56, height: 56 },
    { tableId: "34", roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", x: 356, y: 152, width: 56, height: 56 },
    { tableId: "36", roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", x: 507, y: 99, width: 54, height: 94 },
    { tableId: "37", roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", x: 686, y: 101, width: 128, height: 52 },
    { tableId: "38", roomCode: "b7f34310-195e-4c03-ac05-a660e79dc1ce", x: 686, y: 231, width: 128, height: 52 },

    { tableId: "27", roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", x: 112, y: 302, width: 62, height: 96 },
    { tableId: "28", roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", x: 280, y: 302, width: 60, height: 90 },
    { tableId: "29", roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", x: 390, y: 302, width: 60, height: 90 },
    { tableId: "24", roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", x: 112, y: 454, width: 62, height: 96 },
    { tableId: "25", roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", x: 281, y: 454, width: 60, height: 90 },
    { tableId: "26", roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", x: 389, y: 454, width: 60, height: 90 },
    { tableId: "22", roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", x: 132, y: 619, width: 62, height: 56 },
    { tableId: "20", roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", x: 132, y: 720, width: 62, height: 56 },
    { tableId: "23", roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", x: 301, y: 620, width: 108, height: 56 },
    { tableId: "21", roomCode: "da1d57f0-e0d5-4d7e-86be-9f8300f388b8", x: 301, y: 719, width: 108, height: 56 },

    { tableId: "60", roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", x: 868, y: 425, width: 74, height: 48 },
    { tableId: "50", roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", x: 860, y: 528, width: 118, height: 48 },
    { tableId: "51", roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", x: 1076, y: 524, width: 50, height: 50, rotation: 42 },
    { tableId: "40", roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", x: 694, y: 681, width: 58, height: 92 },
    { tableId: "41", roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", x: 811, y: 681, width: 58, height: 92 },
    { tableId: "42", roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", x: 952, y: 681, width: 58, height: 92 },
    { tableId: "43", roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", x: 1064, y: 681, width: 58, height: 92 },
    { tableId: "13", roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", x: 756, y: 941, width: 58, height: 96 },
    { tableId: "14", roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", x: 903, y: 941, width: 58, height: 96 },
    { tableId: "15", roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", x: 1052, y: 941, width: 58, height: 96 },
    { tableId: "16", roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", x: 1204, y: 941, width: 58, height: 96 },
    { tableId: "17", roomCode: "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c", x: 1353, y: 941, width: 58, height: 96 },

    { tableId: "10", roomCode: "32986b6b-4f7f-4924-a9de-c76445e1031e", x: 316, y: 941, width: 58, height: 96 },
    { tableId: "11", roomCode: "32986b6b-4f7f-4924-a9de-c76445e1031e", x: 462, y: 941, width: 58, height: 96 },
    { tableId: "12", roomCode: "32986b6b-4f7f-4924-a9de-c76445e1031e", x: 609, y: 941, width: 58, height: 96 },
  ] satisfies MasterTableVisual[],
};

export const findMasterRoomRegion = (roomCode: string) =>
  TORTUGA_MASTER_TABLE_MAP.roomRegions.find((room) => room.roomCode === roomCode);

export const getMasterTableVisuals = () => TORTUGA_MASTER_TABLE_MAP.tables;
