"use client"

import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useUser } from "@clerk/nextjs"           // ← add this
import DockDemo from "@/components/layout/Button"
import DefaultDemo from "../Navbar"

export default function ClientDockWrapper() {
  const pathname = usePathname()
  const { isLoaded, isSignedIn } = useUser()     // ← add this

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDeploySubdomain = useMemo(() => {
    if (!mounted) return false
    if (typeof window === "undefined") return false

    const hostname = window.location.hostname
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "falbor.xyz"

    return (
      hostname.endsWith(`.${baseDomain}`) &&
      hostname !== baseDomain &&
      !hostname.startsWith("www.")
    )
  }, [mounted])

  // Hide on:
  // - /chat/* 
  // - /deploy/*
  // - deploy subdomains
  // - landing page (/) WHEN logged in
  const shouldHide =
    !mounted ||
    pathname === "/chat" || pathname?.startsWith("/chat/") ||
    pathname === "/settings" || pathname?.startsWith("/settings/") ||
    pathname === "/profile" || pathname?.startsWith("/profile/") ||
    pathname === "/deploy" || pathname?.startsWith("/deploy/") ||
    pathname === "/projects" || pathname?.startsWith("/projects/") ||
    ((pathname === "/templates" || pathname?.startsWith("/templates/")) && isSignedIn) ||
    isDeploySubdomain ||
    (pathname === "/" && isSignedIn)   // ← this is the new condition

  if (shouldHide) return null

  // Optional: show a small loading state while Clerk is checking auth
  if (!isLoaded) {
    return <div className="h-12" /> // placeholder to avoid layout shift
  }

  return (
    <div>
      <DefaultDemo />
      {/* <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <DockDemo />
      </div> */}
    </div>
  )
}