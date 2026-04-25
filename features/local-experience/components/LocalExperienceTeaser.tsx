"use client";

import Link from "next/link";

import { localExperiencePublicConfig } from "@/lib/config";
import { triggerHaptic } from "@/lib/haptics";

export function LocalExperienceTeaser() {
  return (
    <div className="panel rounded-[2rem] p-5">
      <div className="space-y-2">
        <p className="eyebrow">Solo in locale</p>
        <h2 className="text-2xl font-semibold text-white">
          {localExperiencePublicConfig.title}
        </h2>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          {localExperiencePublicConfig.description}
        </p>
      </div>

      <Link
        href={localExperiencePublicConfig.claimPath}
        className="button-primary mt-4 inline-flex min-h-12 w-full items-center justify-center px-5 text-sm"
        onClick={() => triggerHaptic()}
      >
        Scansiona QR
      </Link>
    </div>
  );
}
