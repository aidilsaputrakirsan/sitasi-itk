// components/ui/select.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Simple interfaces for our select components
interface SelectProps extends React.ComponentPropsWithoutRef<"div"> {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
}

interface SelectTriggerProps extends React.ComponentPropsWithoutRef<"button"> {
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

interface SelectContentProps extends React.ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
}

interface SelectItemProps extends React.ComponentPropsWithoutRef<"button"> {
  value: string;
  children: React.ReactNode;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  open: false,
  setOpen: () => {},
})

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ className, value, onValueChange, defaultValue, children, ...props }, ref) => {
    const [open, setOpen] = React.useState(false)
    const [internalValue, setInternalValue] = React.useState(defaultValue || "")
    
    // Handle controlled and uncontrolled component
    const handleValueChange = (newValue: string) => {
      if (onValueChange) {
        onValueChange(newValue)
      }
      setInternalValue(newValue)
    }
    
    return (
      <SelectContext.Provider 
        value={{ 
          value: value || internalValue, 
          onValueChange: handleValueChange, 
          defaultValue, 
          open, 
          setOpen 
        }}
      >
        <div ref={ref} className={cn("relative", className)} {...props}>
          {children}
        </div>
      </SelectContext.Provider>
    )
  }
)
Select.displayName = "Select"

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext)
    
    return (
      <button
        type="button"
        ref={ref}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="h-4 w-4 opacity-50"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ placeholder, children }) => {
    const { value } = React.useContext(SelectContext)
    return (
      <span className="text-sm">
        {value ? children : placeholder}
      </span>
    )
  }
)
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open } = React.useContext(SelectContext)
    
    if (!open) return null
    
    return (
      <div 
        ref={ref}
        className={cn(
          "absolute z-50 min-w-[8rem] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md mt-1",
          className
        )} 
        {...props}
      >
        <div className="p-1">
          {children}
        </div>
      </div>
    )
  }
)
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<HTMLButtonElement, SelectItemProps>(
  ({ className, children, value, ...props }, ref) => {
    const { onValueChange, setOpen } = React.useContext(SelectContext)
    
    const handleClick = () => {
      if (onValueChange) {
        onValueChange(value)
      }
      setOpen(false)
    }
    
    return (
      <button
        ref={ref}
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  }
)
SelectItem.displayName = "SelectItem"

// Empty placeholder components
const SelectGroup = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
const SelectSeparator = () => <div className="h-px my-1 bg-muted" />
const SelectLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="py-1.5 pl-2 text-sm font-semibold">{children}</div>
)
const SelectScrollUpButton = () => null
const SelectScrollDownButton = () => null

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}