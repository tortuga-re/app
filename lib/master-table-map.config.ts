export type MasterRoomRegion = {
  roomCode: string;
  publicName: string;
  polygon: string;
  badgeX: number;
  badgeY: number;
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
};

export const findMasterRoomRegion = (roomCode: string) =>
  TORTUGA_MASTER_TABLE_MAP.roomRegions.find((room) => room.roomCode === roomCode);
