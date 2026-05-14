import "server-only";

import type { LiveTvMediaAsset } from "@/lib/live-tv/types";
import { setAppStateJson, getAppStateJson } from "@/lib/server/app-state";

const LIVE_TV_MEDIA_LIBRARY_KEY = "live_tv_media_library";

const sortAssets = (assets: LiveTvMediaAsset[]) =>
  [...assets].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

export const listLiveTvMediaAssets = async (): Promise<LiveTvMediaAsset[]> =>
  sortAssets(await getAppStateJson<LiveTvMediaAsset[]>(LIVE_TV_MEDIA_LIBRARY_KEY, []));

export const saveLiveTvMediaAsset = async (asset: LiveTvMediaAsset) => {
  const currentAssets = await listLiveTvMediaAssets();
  const nextAssets = sortAssets([
    asset,
    ...currentAssets.filter((existingAsset) => existingAsset.id !== asset.id),
  ]);

  await setAppStateJson(LIVE_TV_MEDIA_LIBRARY_KEY, nextAssets);
  return nextAssets;
};
