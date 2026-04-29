import { Suspense } from "react";
import { MatchDrinkPlayerController } from "@/components/match-drink/MatchDrinkPlayerController";

export default function MatchDrinkGamePage() {
  return (
    <Suspense fallback={null}>
      <MatchDrinkPlayerController />
    </Suspense>
  );
}
