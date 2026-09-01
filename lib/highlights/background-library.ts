import "server-only";

import { getAppStateJson, setAppStateJson } from "@/lib/server/app-state";

export type HighlightBackgroundAsset = {
  id: string;
  title: string;
  mediaUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

const HIGHLIGHT_BACKGROUND_LIBRARY_KEY = "highlight_background_library";

const sortAssets = (assets: HighlightBackgroundAsset[]) =>
  [...assets].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

export const listHighlightBackgroundAssets = async () =>
  sortAssets(
    await getAppStateJson<HighlightBackgroundAsset[]>(
      HIGHLIGHT_BACKGROUND_LIBRARY_KEY,
      [],
    ),
  );

export const saveHighlightBackgroundAsset = async (
  asset: HighlightBackgroundAsset,
) => {
  const currentAssets = await listHighlightBackgroundAssets();
  const nextAssets = sortAssets([
    asset,
    ...currentAssets.filter((currentAsset) => currentAsset.id !== asset.id),
  ]);

  await setAppStateJson(HIGHLIGHT_BACKGROUND_LIBRARY_KEY, nextAssets);
  return nextAssets;
};
