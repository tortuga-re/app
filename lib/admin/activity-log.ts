import "server-only";

import { randomUUID } from "node:crypto";

import { getAppStateJson, setAppStateJson } from "@/lib/server/app-state";

export type AdminActivity = {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
};

const ACTIVITY_KEY = "admin_activity_log";
const MAX_ITEMS = 50;

export const listAdminActivity = async () =>
  getAppStateJson<AdminActivity[]>(ACTIVITY_KEY, []);

export const recordAdminActivity = async (action: string, detail: string) => {
  const current = await listAdminActivity();
  const next = [{ id: randomUUID(), action, detail, createdAt: new Date().toISOString() }, ...current].slice(0, MAX_ITEMS);
  await setAppStateJson(ACTIVITY_KEY, next);
  return next[0];
};
