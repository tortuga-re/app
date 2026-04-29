"use client";

import React from "react";

interface MatchDrinkShellProps {
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export function MatchDrinkShell({
  children,
  maxWidth = "max-w-md",
  className = "",
}: MatchDrinkShellProps) {
  return (
    <div className={`relative min-h-screen overflow-x-hidden ${className}`}>
      {/* Background elements */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-20 h-64 bg-[linear-gradient(180deg,rgba(216,176,106,0.1),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(178,122,52,0.15),transparent_50%)]" />
      </div>

      <div className={`relative mx-auto flex min-h-screen w-full flex-col px-4 pt-8 ${maxWidth}`}>
        {children}
      </div>
    </div>
  );
}
