import "server-only";

import { randomUUID } from "node:crypto";

import { getAppStateJson, setAppStateJson } from "@/lib/server/app-state";
import type { LiveTvItem, LiveTvUpsertItemInput } from "./types";

const TEMPLATE_KEY = "live_tv_playlist_templates";

export type LiveTvPlaylistTemplate = {
  id: string;
  name: string;
  items: LiveTvUpsertItemInput[];
  createdAt: string;
  updatedAt: string;
};

const toInput = (item: LiveTvItem): LiveTvUpsertItemInput => ({
  type: item.type,
  title: item.title,
  body: item.body,
  mediaUrl: item.mediaUrl,
  qrUrl: item.qrUrl,
  qrLabel: item.qrLabel,
  durationSeconds: item.durationSeconds,
  enabled: item.enabled,
  order: item.order,
  styleVariant: item.styleVariant,
});

export const listLiveTvTemplates = () =>
  getAppStateJson<LiveTvPlaylistTemplate[]>(TEMPLATE_KEY, []);

export const saveLiveTvTemplate = async (name: string, playlist: LiveTvItem[]) => {
  const cleanName = name.trim().slice(0, 80);
  if (!cleanName) throw new Error("Inserisci un nome per la scaletta.");

  const current = await listLiveTvTemplates();
  const timestamp = new Date().toISOString();
  const existing = current.find((template) => template.name.toLowerCase() === cleanName.toLowerCase());
  const next: LiveTvPlaylistTemplate = {
    id: existing?.id ?? randomUUID(),
    name: cleanName,
    items: playlist.map(toInput),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  await setAppStateJson(TEMPLATE_KEY, [next, ...current.filter((template) => template.id !== next.id)].slice(0, 30));
  return next;
};

export const deleteLiveTvTemplate = async (id: string) => {
  const current = await listLiveTvTemplates();
  await setAppStateJson(TEMPLATE_KEY, current.filter((template) => template.id !== id));
};
