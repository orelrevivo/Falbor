import * as React from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isActive?: boolean
}

function Textarea({ className, isActive = false, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "p-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "min-h-16 w-full resize-none overflow-y-auto bg-transparent text-base transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }