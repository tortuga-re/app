"use client";

import { MatchDrinkStage } from "@/components/match-drink/MatchDrinkStage";
import { useParams } from "next/navigation";

export default function MatchDrinkStagePage() {
  const { id } = useParams<{ id: string }>();
  
  if (!id) return null;

  return <MatchDrinkStage sessionId={id} />;
}
