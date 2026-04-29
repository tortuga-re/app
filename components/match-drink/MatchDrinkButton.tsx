"use client";

import React from "react";
import { triggerHaptic } from "@/lib/haptics";

interface MatchDrinkButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "md" | "lg" | "xl";
  loading?: boolean;
}

export function MatchDrinkButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  onClick,
  disabled,
  ...props
}: MatchDrinkButtonProps) {
  const variantClass = 
    variant === "primary" ? "button-primary" : 
    variant === "secondary" ? "button-secondary" : 
    "button-secondary border-red-500/50 text-red-400"; // Custom danger for secondary look

  const sizeClass = 
    size === "md" ? "min-h-12 px-6 text-sm" : 
    size === "lg" ? "min-h-14 px-8 text-base" : 
    "min-h-20 px-10 text-xl font-bold uppercase tracking-wider";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerHaptic();
    if (onClick) onClick(e);
  };

  return (
    <button
      className={`${variantClass} ${sizeClass} flex items-center justify-center transition-opacity disabled:opacity-50 ${className}`}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Caricamento...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
