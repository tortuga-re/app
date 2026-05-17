import * as React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", isLoading, children, disabled, ...props }, ref) => {
    const baseClass = variant === "primary" ? "button-primary" : "button-secondary";
    
    return (
      <button
        ref={ref}
        className={`flex items-center justify-center gap-2 px-6 py-3 font-bold uppercase tracking-wider text-sm ${baseClass} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin" size={18} />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
