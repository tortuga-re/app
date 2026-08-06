"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface CollapsibleWrapperProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

export function CollapsibleWrapper({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
  className = "",
  titleClassName = "",
}: CollapsibleWrapperProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`panel rounded-[2rem] p-5 transition-all ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between text-left focus:outline-none group cursor-pointer"
      >
        <div className="space-y-1 pr-2">
          <div className={`text-lg font-black uppercase italic text-white flex items-center gap-2 ${titleClassName}`}>
            {title}
          </div>
          {subtitle ? (
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {badge}
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(255,216,156,0.25)] bg-[rgba(12,9,7,0.72)] text-[var(--accent-strong)] transition-transform group-hover:border-[var(--accent-strong)]">
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </button>

      {isOpen ? (
        <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in duration-200">
          {children}
        </div>
      ) : null}
    </div>
  );
}
