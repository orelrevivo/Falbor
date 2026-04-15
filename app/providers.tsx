"use client"

import { WorkbenchProvider } from "@/lib/workbench-context"
import { ThemeProvider } from "next-themes"

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <WorkbenchProvider>
        {children}
      </WorkbenchProvider>
    </ThemeProvider>
  )
}