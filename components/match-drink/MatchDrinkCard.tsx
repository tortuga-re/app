"use client";

import React from "react";

interface MatchDrinkCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "muted" | "accent";
}

export function MatchDrinkCard({
  children,
  className = "",
  variant = "default",
}: MatchDrinkCardProps) {
  const baseClass = variant === "muted" ? "panel-muted" : "panel";
  const accentClass = variant === "accent" ? "border-[var(--accent-strong)] shadow-[0_0_20px_rgba(216,176,106,0.1)]" : "";

  return (
    <div className={`${baseClass} rounded-[2rem] p-6 ${accentClass} ${className}`}>
      {children}
    </div>
  );
}
