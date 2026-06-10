import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "muted" | "metal";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", variant = "default", children, ...props }, ref) => {
    const variantClass = 
      variant === "default" ? "panel" : 
      variant === "metal" ? "panel-metal" : "panel-muted";
    
    return (
      <div
        ref={ref}
        className={`rounded-[2.4rem] p-6 md:p-8 ${variantClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";
