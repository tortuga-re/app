import "server-only";

import { randomUUID } from "node:crypto";

import type { PushAudienceSegment } from "@/lib/push/types";
import { getAppStateJson, setAppStateJson } from "@/lib/server/app-state";

export type SavedPushSegment = {
  id: string;
  name: string;
  segment: PushAudienceSegment;
  email?: string;
  createdAt: string;
  updatedAt: string;
};

export type SavedPushCampaign = {
  id: string;
  name: string;
  title: string;
  body: string;
  url: string;
  segment: PushAudienceSegment;
  email?: string;
  createdAt: string;
  updatedAt: string;
};

type PushLibraryState = {
  segments: SavedPushSegment[];
  campaigns: SavedPushCampaign[];
};

const PUSH_LIBRARY_KEY = "push_marketing_library";

const sortByUpdatedAt = <T extends { updatedAt: string }>(items: T[]) =>
  [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

const getLibraryState = () =>
  getAppStateJson<PushLibraryState>(PUSH_LIBRARY_KEY, {
    segments: [],
    campaigns: [],
  });

const saveLibraryState = (value: PushLibraryState) =>
  setAppStateJson(PUSH_LIBRARY_KEY, value);

export const listSavedPushLibrary = async () => {
  const state = await getLibraryState();
  return {
    segments: sortByUpdatedAt(state.segments),
    campaigns: sortByUpdatedAt(state.campaigns),
  };
};

export const savePushSegment = async (
  input: Omit<SavedPushSegment, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
) => {
  const state = await getLibraryState();
  const now = new Date().toISOString();
  const existing = state.segments.find((segment) => segment.id === input.id);
  const nextSegment: SavedPushSegment = {
    id: existing?.id || input.id || randomUUID(),
    name: input.name.trim(),
    segment: input.segment,
    email: input.email?.trim().toLowerCase() || undefined,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const nextState: PushLibraryState = {
    ...state,
    segments: sortByUpdatedAt([
      nextSegment,
      ...state.segments.filter((segment) => segment.id !== nextSegment.id),
    ]),
  };

  await saveLibraryState(nextState);
  return nextSegment;
};

export const savePushCampaign = async (
  input: Omit<SavedPushCampaign, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
) => {
  const state = await getLibraryState();
  const now = new Date().toISOString();
  const existing = state.campaigns.find((campaign) => campaign.id === input.id);
  const nextCampaign: SavedPushCampaign = {
    id: existing?.id || input.id || randomUUID(),
    name: input.name.trim(),
    title: input.title.trim(),
    body: input.body.trim(),
    url: input.url.trim() || "/ciurma",
    segment: input.segment,
    email: input.email?.trim().toLowerCase() || undefined,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const nextState: PushLibraryState = {
    ...state,
    campaigns: sortByUpdatedAt([
      nextCampaign,
      ...state.campaigns.filter((campaign) => campaign.id !== nextCampaign.id),
    ]),
  };

  await saveLibraryState(nextState);
  return nextCampaign;
};
