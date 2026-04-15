import * as React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isActive?: boolean;
}

function Input({ className, type, isActive = false, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "p-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "h-9 w-full min-w-0 bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }