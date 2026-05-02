"use client";

import Link from "next/link";

import { localExperiencePublicConfig } from "@/lib/config";
import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export function LocalExperienceTeaser({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <div className={cn("panel rounded-[2rem] p-5", className)}>
      <div className="space-y-2">
        <p className="eyebrow">{localExperiencePublicConfig.eyebrow}</p>
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
        onClick={() => {
          triggerHaptic();
          onClick?.();
        }}
      >
        Scansiona QR
      </Link>
    </div>
  );
}
