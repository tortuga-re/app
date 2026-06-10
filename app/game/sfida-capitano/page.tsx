import { redirect } from "next/navigation";

import { scratchAndWinConfig } from "@/lib/scratch-and-win";

export default function ScratchAndWinRedirectPage() {
  redirect(scratchAndWinConfig.url);
}
