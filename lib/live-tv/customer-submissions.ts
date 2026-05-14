import "server-only";

import type { LiveTvCustomerSubmission } from "@/lib/live-tv/types";
import { getAppStateJson, setAppStateJson } from "@/lib/server/app-state";

const LIVE_TV_CUSTOMER_SUBMISSIONS_KEY = "live_tv_customer_submissions";

const sortSubmissions = (submissions: LiveTvCustomerSubmission[]) =>
  [...submissions].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

export const listLiveTvCustomerSubmissions = async () =>
  sortSubmissions(
    await getAppStateJson<LiveTvCustomerSubmission[]>(
      LIVE_TV_CUSTOMER_SUBMISSIONS_KEY,
      [],
    ),
  );

export const getLiveTvCustomerSubmissionById = async (submissionId: string) => {
  const current = await listLiveTvCustomerSubmissions();
  return current.find((submission) => submission.id === submissionId) ?? null;
};

export const saveLiveTvCustomerSubmission = async (
  submission: LiveTvCustomerSubmission,
) => {
  const current = await listLiveTvCustomerSubmissions();
  const next = sortSubmissions([
    submission,
    ...current.filter((existing) => existing.id !== submission.id),
  ]);

  await setAppStateJson(LIVE_TV_CUSTOMER_SUBMISSIONS_KEY, next);
  return next;
};
