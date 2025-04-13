// components/ui/select.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SelectProps extends React.ComponentPropsWithoutRef<"select"> {
  label?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-red-500 text-xs mt-1">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export const Option: React.FC<React.OptionHTMLAttributes<HTMLOptionElement>> = ({ children, ...props }) => {
  return <option {...props}>{children}</option>;
};