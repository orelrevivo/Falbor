"use client"

import { WorkbenchProvider } from "@/lib/workbench-context"

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkbenchProvider>
      {children}
    </WorkbenchProvider>
  )
}