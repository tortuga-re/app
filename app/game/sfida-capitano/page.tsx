import { CaptainChallenge } from "@/features/game/components/CaptainChallenge";

export default async function CaptainChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const params = await searchParams;
  const referralCode = Array.isArray(params.ref) ? params.ref[0] : params.ref;

  return <CaptainChallenge incomingReferralCode={referralCode ?? ""} />;
}
