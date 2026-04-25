import { LocalExperienceClaim } from "@/features/local-experience/components/LocalExperienceClaim";

export const metadata = {
  title: "Esperienze solo in locale",
};

const readParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function LocalExperiencePage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string | string[];
    source?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const token = readParam(params.token) || readParam(params.source);

  return <LocalExperienceClaim token={token} />;
}
