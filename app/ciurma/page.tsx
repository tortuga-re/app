import { CiurmaTabs } from "@/components/ciurma-tabs";

export default async function CiurmaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const requestedTab = params.tab;
  const initialTab = requestedTab === "ranks" || requestedTab === "achievements" || requestedTab === "history"
    ? requestedTab === "history" ? "achievements" : requestedTab
    : "rewards";

  return <>
    <CiurmaTabs initialTab={initialTab} />
  </>;
}
