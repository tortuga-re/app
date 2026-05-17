import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, label, id, ...props }, ref) => {
    const inputId = id || props.name;
    
    return (
      <div className="flex w-full flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="eyebrow ml-3">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`field ${error ? "border-red-500 focus:border-red-500" : ""} ${className}`}
          {...props}
        />
        {error && <span className="text-xs font-semibold text-red-400 pl-4">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
