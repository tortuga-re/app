import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatusBlock({
  title,
  description,
  action,
  variant = "info",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  variant?: "info" | "loading" | "empty" | "error";
}) {
  return (
    <div
      className={cn(
        "panel rounded-[1.9rem] p-5",
        variant === "error" && "border-[color:rgba(240,139,117,0.28)]",
      )}
      role={variant === "loading" ? "status" : undefined}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-1 flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,216,156,0.1)] bg-[rgba(255,255,255,0.03)]",
          )}
        >
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              variant === "loading" && "animate-pulse bg-[var(--accent)]",
              variant === "error" && "bg-[var(--danger)]",
              variant === "empty" && "bg-white/30",
              variant === "info" && "bg-[var(--accent-strong)]",
            )}
          />
        </div>
        <div className="space-y-2">
          <h2
            className={cn(
              "text-[1.02rem] font-semibold text-white",
              variant === "error" && "text-[var(--text)]",
            )}
          >
            {title}
          </h2>
          <p className="text-sm leading-6 text-[var(--text-muted)]">{description}</p>
          {action ? <div className="pt-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
