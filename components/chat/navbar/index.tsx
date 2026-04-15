"use client"

import Link from "next/link"
import { useUser, useClerk, useAuth } from "@clerk/nextjs"
import { useState, useRef, useEffect, useCallback } from "react"
import {
  Copy,
  ExternalLink,
  Check,
  Share2,
  Globe,
  Pencil,
  List,
  Image as ImageIcon,
  Search,
  Crown,
  Upload,
  X,
  Loader2,
  RefreshCw,
  TerminalIcon,
  AppWindow,
  ChevronDown,
  Download,
  Lock,
  Palette,
  Database,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDistanceToNow } from "date-fns"
import { ShareDialog } from "@/components/chat/share-dialog"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { useWorkbench } from "@/lib/workbench-context"
import * as LucideIcons from "lucide-react"
import { PreviewToolbar } from "@/components/workbench/preview-toolbar"
import { DEVICE_PRESETS } from "@/components/workbench/device-presets"

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Zap
  return <IconComponent className={className} />
}

// ─── PayPal Button Wrapper ──────────────────────────────────────────────────────

function PayPalButtonWrapper({
  domain,
  price,
  projectId,
  onSuccess,
}: {
  domain: string
  price: number
  projectId: string
  onSuccess: () => void
}) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer()
  const { getToken } = useAuth()

  if (isRejected) {
    return (
      <div className="text-red-600 text-sm py-3 text-center border border-red-200 rounded bg-red-50">
        Failed to load PayPal. Please refresh the page or try again later.
      </div>
    )
  }

  return (
    <>
      {isPending && (
        <div className="flex items-center justify-center gap-2 py-4 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading PayPal...
        </div>
      )}

      <PayPalButtons
        style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay", height: 40 }}
        disabled={price <= 0}
        createOrder={async () => {
          try {
            const token = await getToken()
            const res = await fetch(`/api/projects/${projectId}/domain/purchase`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                action: "create-paypal-order",
                domain,
                price,
              }),
            })

            if (!res.ok) {
              const err = await res.json()
              throw new Error(err.error || "Failed to create PayPal order")
            }

            const data = await res.json()
            return data.paypalOrderId
          } catch (err) {
            console.error("createOrder error:", err)
            throw err
          }
        }}
        onApprove={async (data) => {
          try {
            const token = await getToken()
            const res = await fetch(`/api/projects/${projectId}/domain/purchase`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                action: "capture-paypal-order",
                paypalOrderId: data.orderID,
                domain,
                price,
              }),
            })

            if (!res.ok) {
              const err = await res.json()
              throw new Error(err.error || "Payment capture failed")
            }

            onSuccess()
          } catch (err) {
            console.error("Capture error:", err)
            alert("Payment processing failed. Please contact support.")
          }
        }}
        onError={(err) => {
          console.error("[PAYPAL ERROR]", err)
          alert("PayPal encountered an error. Please try again.")
        }}
      />
    </>
  )
}

// ─── Types ──────────────────────────────────────────────────────────────────────

interface CreditsData {
  credits: number
  secondsUntilNextRegen: number
  pendingGift?: number
  pendingMonthly?: number
  subscriptionTier?: string
}

interface DeploymentData {
  deploymentUrl: string
  updatedAt: string
  subdomain: string
  customDomain?: string
}

interface SiteMetaData {
  favicon: string | null
  siteTitle: string | null
  siteDescription: string | null
}

interface DomainResult {
  domain: string
  available: boolean
  price: number
  currency: string
}

interface NavbarProps {
  projectId: string
  handleDownload: () => void
  isTerminalOpen?: boolean
  onToggleTerminal?: () => void
  isSplitScreen?: boolean
  onEnterSplit?: () => void
  projectName?: string
  role?: "viewer" | "editor" | "admin"
}

type OpenDropdown = "profile" | "publish" | "share" | "project" | null
type PublishView =
  | "main"
  | "edit-domain"
  | "site-meta"
  | "custom-domain"
  | "domain-search-results"
  | "domain-checkout"

// ─── Backdrop Component ─────────────────────────────────────────────────────────

function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-40"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.15)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
    />
  )
}

// ─── Dropdown Panel Component ───────────────────────────────────────────────────

function DropdownPanel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "absolute top-full right-0 mt-[-10px] z-50 bg-white dark:bg-[#1E1E21] border dark:border-white/10 rounded-lg shadow-xs",
        className
      )}
    >
      {children}
    </motion.div>
  )
}

// ─── View Transition Wrapper ────────────────────────────────────────────────────

function ViewTransition({
  children,
  viewKey,
}: {
  children: React.ReactNode
  viewKey: string
}) {
  return (
    <motion.div
      key={viewKey}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}

// ─── Main Navbar ────────────────────────────────────────────────────────────────
export function Navbar({
  projectId,
  handleDownload,
  isTerminalOpen,
  onToggleTerminal,
  isSplitScreen,
  onEnterSplit,
  projectName,
  role = "admin",
}: NavbarProps) {
  const isAdmin = role === "admin"
  const isViewer = role === "viewer"
  const { user, isLoaded } = useUser()
  const clerk = useClerk()
  const { getToken } = useAuth()
  const {
    pluginRegistry,
    activeTab,
    previewUrl,
    setPreviewUrl,
    previewPages,
    setPreviewPages,
    selectedDevice,
    setSelectedDevice,
    zoom,
    setZoom,
    isPreviewFullScreen,
    setIsPreviewFullScreen,
    refreshPreview
  } = useWorkbench()

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null)

  const [creditsData, setCreditsData] = useState<CreditsData | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const [isPublishing, setIsPublishing] = useState(false)
  const [deployment, setDeployment] = useState<DeploymentData | null>(null)
  const [copied, setCopied] = useState(false)

  // Publish dialog internal state
  const [publishView, setPublishView] = useState<PublishView>("main")
  const [newSubdomain, setNewSubdomain] = useState("")
  const [republishAfterUpdate, setRepublishAfterUpdate] = useState(true)
  const [isSavingDomain, setIsSavingDomain] = useState(false)

  // Site Meta state
  const [siteMeta, setSiteMeta] = useState<SiteMetaData>({
    favicon: null,
    siteTitle: null,
    siteDescription: null,
  })
  const [isSavingMeta, setIsSavingMeta] = useState(false)
  const [metaLoaded, setMetaLoaded] = useState(false)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  // Domain search state
  const [domainQuery, setDomainQuery] = useState("")
  const [domainResults, setDomainResults] = useState<DomainResult[]>([])
  const [isSearchingDomains, setIsSearchingDomains] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<DomainResult | null>(null)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false)

  // Close dropdown handler
  const closeDropdown = useCallback(() => {
    setOpenDropdown(null)
    setPublishView("main")
    setPurchaseSuccess(false)
  }, [])

  // Fetch credits + timer
  useEffect(() => {
    if (!isLoaded || !user?.id) return

    const fetchCredits = async () => {
      try {
        const res = await fetch("/api/user/credits")
        if (res.ok) {
          const data: CreditsData = await res.json()
          setCreditsData(data)
          setTimeLeft(data.secondsUntilNextRegen)
        }
      } catch (err) {
        console.error("Failed to fetch credits:", err)
      }
    }

    fetchCredits()

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchCredits()
          return 60
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isLoaded, user?.id])

  // Fetch deployment on mount and when dropdown opens
  useEffect(() => {
    const fetchDeployment = async () => {
      try {
        const token = await getToken()
        const res = await fetch(`/api/projects/${projectId}/deployment`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          if (data.deployment?.subdomain) {
            setDeployment({
              deploymentUrl: data.deployment.deploymentUrl || "",
              updatedAt: data.deployment.updatedAt || "",
              subdomain: data.deployment.subdomain,
              customDomain: data.deployment.customDomain,
            })
            setNewSubdomain(data.deployment.subdomain)
          } else if (data.subdomain) {
            setDeployment({
              deploymentUrl: "",
              updatedAt: "",
              subdomain: data.subdomain,
            })
            setNewSubdomain(data.subdomain)
          }
        }
      } catch (err) {
        console.error("Failed to fetch deployment:", err)
      }
    }

    fetchDeployment()
  }, [projectId, getToken])

  // Fetch site meta when entering site-meta view
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const token = await getToken()
        const res = await fetch(`/api/projects/${projectId}/deployment/meta`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.deployment) {
            setSiteMeta({
              favicon: data.deployment.favicon || null,
              siteTitle: data.deployment.siteTitle || null,
              siteDescription: data.deployment.siteDescription || null,
            })
          }
          setMetaLoaded(true)
        }
      } catch (err) {
        console.error("Failed to fetch site meta:", err)
        setMetaLoaded(true)
      }
    }

    if (publishView === "site-meta" && !metaLoaded) {
      fetchMeta()
    }
  }, [publishView, metaLoaded, projectId, getToken])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      const token = await getToken()

      const buildPromise = new Promise((resolve, reject) => {
        const handleComplete = (e: any) => {
          cleanup()
          resolve(e.detail)
        }
        const handleError = (e: any) => {
          cleanup()
          reject(new Error(e.detail?.message || "Build failed"))
        }
        const cleanup = () => {
          window.removeEventListener("build-deploy-complete", handleComplete)
          window.removeEventListener("build-deploy-error", handleError)
        }

        window.addEventListener("build-deploy-complete", handleComplete)
        window.addEventListener("build-deploy-error", handleError)

        window.dispatchEvent(
          new CustomEvent("initiate-build-and-deploy", {
            detail: { projectId, subdomain: newSubdomain, republish: republishAfterUpdate, token },
          })
        )
      })

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Build timed out. Please open the Preview tab and ensure files have finished loading before publishing."
              )
            ),
          120000
        )
      )

      const data: any = await Promise.race([buildPromise, timeoutPromise])

      setDeployment({
        deploymentUrl: data.deploymentUrl,
        updatedAt: new Date().toISOString(),
        subdomain: data.subdomain || projectId.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      })
      window.open(data.deploymentUrl, "_blank", "noopener,noreferrer")
    } catch (error) {
      alert(`Failed to deploy: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUpdateDomain = async () => {
    if (!deployment || !newSubdomain.trim() || newSubdomain === deployment.subdomain) {
      setPublishView("main")
      return
    }

    setIsSavingDomain(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subdomain: newSubdomain.trim(),
          republish: republishAfterUpdate,
        }),
      })

      if (!res.ok) throw new Error("Domain update failed")

      const data = await res.json()
      setDeployment({
        deploymentUrl: data.deploymentUrl,
        updatedAt: new Date().toISOString(),
        subdomain: data.subdomain,
      })
      setPublishView("main")
    } catch (err) {
      alert("Failed to update domain")
      console.error(err)
    } finally {
      setIsSavingDomain(false)
    }
  }

  const handleCopyDeploymentUrl = async () => {
    if (deployment?.deploymentUrl) {
      await navigator.clipboard.writeText(deployment.deploymentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 65536) {
      alert("Favicon must be under 64KB")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setSiteMeta((prev) => ({ ...prev, favicon: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleSaveMeta = async () => {
    setIsSavingMeta(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/projects/${projectId}/deployment/meta`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          favicon: siteMeta.favicon,
          siteTitle: siteMeta.siteTitle,
          siteDescription: siteMeta.siteDescription,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save")
      }

      setPublishView("main")
    } catch (err: any) {
      alert(err.message || "Failed to save site meta")
    } finally {
      setIsSavingMeta(false)
    }
  }

  const handleDomainSearch = async () => {
    if (!domainQuery.trim()) return

    setIsSearchingDomains(true)
    setDomainResults([])

    try {
      const token = await getToken()
      const res = await fetch(
        `/api/domains/search?query=${encodeURIComponent(domainQuery.trim())}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!res.ok) {
        const err = await res.json()
        if (res.status === 403) {
          alert(err.error || "Pro subscription required")
          return
        }
        throw new Error(err.error || "Search failed")
      }

      const data = await res.json()
      setDomainResults(data.results || [])
      setPublishView("domain-search-results")
    } catch (err: any) {
      alert(err.message || "Domain search failed")
    } finally {
      setIsSearchingDomains(false)
    }
  }

  const handleSelectDomain = (domain: DomainResult) => {
    setSelectedDomain(domain)
    setPublishView("domain-checkout")
  }

  const handleRefreshPrice = async () => {
    if (!selectedDomain) return

    setIsRefreshingPrice(true)
    try {
      const token = await getToken()
      const res = await fetch(
        `/api/domains/search?query=${encodeURIComponent(selectedDomain.domain)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (res.ok) {
        const data = await res.json()
        const updatedDomain = data.results?.[0]
        if (updatedDomain && updatedDomain.price > 0) {
          setSelectedDomain(updatedDomain)
        } else {
          alert("Failed to fetch updated price")
        }
      }
    } catch (err) {
      console.error("Refresh price failed:", err)
      alert("Failed to refresh price")
    } finally {
      setIsRefreshingPrice(false)
    }
  }

  // ─── Publish View Header Title ────────────────────────────────────────────

  const getPublishTitle = () => {
    switch (publishView) {
      case "main":
        return "Publish Your Site"
      case "edit-domain":
        return "Edit Domain"
      case "site-meta":
        return "Site Settings"
      case "custom-domain":
        return "Custom Domain"
      case "domain-search-results":
        return "Domain Results"
      case "domain-checkout":
        return "Checkout"
      default:
        return "Publish"
    }
  }

  const getBackView = (): PublishView | null => {
    switch (publishView) {
      case "edit-domain":
      case "site-meta":
      case "custom-domain":
        return "main"
      case "domain-search-results":
        return "custom-domain"
      case "domain-checkout":
        return "domain-search-results"
      default:
        return null
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <nav className="z-[9999] w-full">
      <div className="flex h-10 items-center justify-end">

        {/* In fullscreen: show only the PreviewToolbar, centered */}
        {isPreviewFullScreen ? (
          <div className="flex-1 flex justify-center px-4">
            <div className="max-w-6xl w-full">
              <PreviewToolbar
                url={previewUrl}
                onRefresh={refreshPreview}
                selectedDevice={selectedDevice}
                onDeviceChange={setSelectedDevice}
                zoom={zoom}
                onZoomChange={setZoom}
                isFullScreen={isPreviewFullScreen}
                onToggleFullScreen={() => setIsPreviewFullScreen(!isPreviewFullScreen)}
                pages={previewPages}
                onToggleTerminal={onToggleTerminal}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full">
            {activeTab === "preview" && (
              <div className="flex-1 flex justify-center px-4">
                <div className="max-w-6xl w-full">
                  <PreviewToolbar
                    url={previewUrl}
                    onRefresh={refreshPreview}
                    selectedDevice={selectedDevice}
                    onDeviceChange={setSelectedDevice}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    isFullScreen={isPreviewFullScreen}
                    onToggleFullScreen={() => setIsPreviewFullScreen(!isPreviewFullScreen)}
                    pages={previewPages}
                    onToggleTerminal={onToggleTerminal}
                  />
                </div>
              </div>
            )}

            {user ? (
              <>
                {/* Project Dropdown */}
                <div className="relative">
                  <Button
                    onClick={() => setOpenDropdown(openDropdown === "project" ? null : "project")}
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-black/70 dark:text-white/80 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="font-medium max-w-[150px] truncate">
                      {projectName || "Untitled Project"}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 ", openDropdown === "project" && "")} />
                  </Button>

                  <AnimatePresence>
                    {openDropdown === "project" && (
                      <DropdownPanel className="w-56 overflow-hidden">
                        <div className="p-1.5 flex flex-col gap-1">
                          {/* Download */}
                          <button
                            onClick={() => {
                              handleDownload()
                              closeDropdown()
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-black dark:text-white/90 hover:bg-[#f5f5f5] dark:hover:bg-white/10 rounded transition-colors w-full text-left"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>

                          {/* Split Screen */}
                          {onEnterSplit && !isSplitScreen && (
                            <button
                              onClick={() => {
                                onEnterSplit()
                                closeDropdown()
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-black dark:text-white/90 hover:bg-[#f5f5f5] dark:hover:bg-white/10 rounded transition-colors w-full text-left"
                            >
                              <AppWindow className="w-4 h-4" />
                              Split screen
                            </button>
                          )}

                          {/* Terminal */}
                          {onToggleTerminal && (
                            <button
                              onClick={() => {
                                onToggleTerminal()
                                closeDropdown()
                              }}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors w-full text-left",
                                isTerminalOpen ? "bg-[#d6d4ce] dark:bg-white/10 text-black dark:text-white" : "text-black dark:text-white/90 hover:bg-[#f5f5f5] dark:hover:bg-white/10"
                              )}
                            >
                              <TerminalIcon className="w-4 h-4" />
                              Terminal
                            </button>
                          )}
                        </div>
                      </DropdownPanel>
                    )}
                  </AnimatePresence>
                </div>

                {/* Share */}
                {isAdmin && (
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === "share" ? null : "share")}
                      className={cn(
                        "flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition-colors cursor-pointer",
                        "bg-[#e7e5df] dark:bg-[#2C2C30] text-black/80 dark:text-white dark:hover:text-white"
                      )}
                    >
                      <Share2 size={16} className="dark:text-white" />
                      Share
                    </button>

                    <AnimatePresence>
                      {openDropdown === "share" && (
                        <>
                          {/* <Backdrop onClick={closeDropdown} /> */}
                          <DropdownPanel className="w-96">
                            <ShareDialog
                              projectId={projectId}
                              isOpen={true}
                              onClose={closeDropdown}
                            />
                          </DropdownPanel>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Plugin Navbar Buttons */}
                {pluginRegistry.navbarButtons.map((btn, idx) => (
                  <TooltipProvider key={`${btn.pluginId}-${idx}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => btn.onClick({
                            sendPrompt: (p: string) => (window as any).falbor.sendPrompt(p),
                            setActivePlugin: (id: string | null) => (window as any).falbor.setActivePlugin(id)
                          })}
                          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition-colors BackgroundStyleButton text-black/80 dark:text-white dark:hover:text-white hover:scale-105 active:scale-95"
                        >
                          {btn.icon ? (
                            <DynamicIcon name={btn.icon} className="w-4 h-4 dark:text-white" />
                          ) : (
                            <Zap size={16} className="dark:text-white" />
                          )}
                          {btn.label && <span>{btn.label}</span>}
                        </button>
                      </TooltipTrigger>
                      {btn.tooltip && (
                        <TooltipContent>
                          <p>{btn.tooltip}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                ))}

                <div className="relative group">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            if (isAdmin) {
                              setOpenDropdown(openDropdown === "publish" ? null : "publish")
                            }
                          }}
                          className={cn(
                            "flex items-center gap-1 text-sm px-3 py-1.5 rounded transition-colors",
                            isAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-70",
                            isPublishing
                              ? "bg-[#0099ff]/20 text-[#0099ff] cursor-not-allowed"
                              : "bg-[#e7e5df] dark:bg-[#2C2C30] text-black/80 dark:text-white dark:hover:text-white",
                            !isAdmin && "relative"
                          )}
                          disabled={isPublishing}
                        >
                          {!isAdmin && (
                            <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 shadow-lg z-10 animate-pulse">
                              <Lock className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                          {isPublishing ? "Publishing..." : "Publish"}
                        </button>
                      </TooltipTrigger>
                      {!isAdmin && (
                        <TooltipContent>
                          <p>Only project admins can publish the site</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>

                  <AnimatePresence>
                    {isAdmin && openDropdown === "publish" && (
                      <>

                        <DropdownPanel className="w-96">
                          {/* Header */}
                          <div className="flex items-center justify-between p-4 border-b">
                            {getBackView() !== null && (
                              <button
                                onClick={() => setPublishView(getBackView()!)}
                                className="p-1 BackgroundStyle rounded mr-2 cursor-pointer"
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                            )}
                            <h3 className="font-semibold text-base flex-1 dark:text-white">{getPublishTitle()}</h3>
                            <button
                              onClick={closeDropdown}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-[#2C2C30] rounded cursor-pointer transition-colors"
                            >
                              <X className="w-4 h-4 text-gray-500 dark:text-white/70" />
                            </button>
                          </div>

                          <AnimatePresence mode="wait">
                            {/* ─── MAIN VIEW ──────────────────────────────── */}
                            {publishView === "main" && (
                              <div className="p-4 space-y-4">
                                {true ? (
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between p-1 rounded-sm">
                                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <a
                                                href={deployment?.deploymentUrl || `https://${deployment?.subdomain || '...'}.falbor.xyz`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={cn(
                                                  "flex items-center gap-2 min-w-0 hover:underline",
                                                  !deployment?.deploymentUrl && "opacity-50 pointer-events-none"
                                                )}
                                              >
                                                <Globe className="w-4 h-4 text-gray-600 dark:text-white/70 flex-shrink-0" />
                                                <p className="text-sm font-medium truncate min-w-0 dark:text-white/90">
                                                  {deployment?.subdomain ? `${deployment.subdomain}.falbor.xyz` : "generating..."}
                                                </p>
                                              </a>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              {deployment?.deploymentUrl ? "Open Falbor subdomain" : "Site not published yet"}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>

                                        {deployment?.customDomain && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <a
                                                  href={`https://${deployment.customDomain}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="flex items-center gap-2 min-w-0 hover:underline"
                                                >
                                                  <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                  <p className="text-sm text-amber-700 truncate min-w-0">
                                                    {deployment.customDomain}
                                                  </p>
                                                </a>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                Open custom domain
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}

                                        {deployment?.updatedAt && (
                                          <div className="flex items-center gap-2 mt-1 min-w-0">
                                            <List className="w-4 h-4 text-gray-600 dark:text-white/70 flex-shrink-0" />
                                            <p className="text-xs text-gray-500 dark:text-white/50 truncate min-w-0">
                                              Updated{" "}
                                              {formatDistanceToNow(new Date(deployment.updatedAt), {
                                                addSuffix: true,
                                              })}
                                            </p>
                                          </div>
                                        )}
                                        {!deployment?.deploymentUrl && (
                                          <div className="flex items-center gap-2 mt-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                            <p className="text-[10px] text-amber-600 font-medium">Not published yet</p>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => {
                                            const url = deployment?.deploymentUrl || `https://${deployment?.subdomain}.falbor.xyz`;
                                            navigator.clipboard.writeText(url);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                          }}
                                          className="p-1.5 BackgroundStyle rounded cursor-pointer"
                                          title="Copy link"
                                        >
                                          {copied ? (
                                            <Check className="w-4 h-4 text-black dark:text-white" />
                                          ) : (
                                            <Copy className="w-4 h-4 text-black dark:text-white" />
                                          )}
                                        </button>
                                        <button
                                          onClick={() => setPublishView("edit-domain")}
                                          className="p-1.5 BackgroundStyle rounded cursor-pointer"
                                          title="Edit domain"
                                        >
                                          <Pencil className="w-4 h-4 text-black dark:text-white" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setMetaLoaded(false)
                                            setPublishView("site-meta")
                                          }}
                                          className="p-1.5 BackgroundStyle rounded cursor-pointer"
                                          title="Site settings (favicon, title)"
                                        >
                                          <ImageIcon className="w-4 h-4 text-black dark:text-white" />
                                        </button>
                                        {deployment?.deploymentUrl && (
                                          <a
                                            href={deployment.deploymentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 BackgroundStyle rounded cursor-pointer"
                                            title="Open in new tab"
                                          >
                                            <ExternalLink className="w-4 h-4 text-black dark:text-white" />
                                          </a>
                                        )}
                                      </div>
                                    </div>

                                    {/* Custom Domain button */}
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => creditsData?.subscriptionTier && ["pro", "enterprise"].includes(creditsData.subscriptionTier) ? setPublishView("custom-domain") : null}
                                            className={cn(
                                              "w-full flex items-center gap-2 p-2.5 rounded-md border border-dashed border-gray-300 transition-colors text-sm text-gray-600 cursor-pointer dark:border-white/20 dark:text-white/70 dark:hover:bg-[#2C2C30]",
                                              creditsData?.subscriptionTier && ["pro", "enterprise"].includes(creditsData.subscriptionTier)
                                                ? "hover:border-gray-400 hover:bg-gray-50"
                                                : "opacity-50 cursor-not-allowed"
                                            )}
                                            disabled={!creditsData?.subscriptionTier || !["pro", "enterprise"].includes(creditsData.subscriptionTier)}
                                          >
                                            <Globe className="w-4 h-4" />
                                            <span>Custom Domain</span>
                                            <Crown className="w-3.5 h-3.5 text-amber-500 ml-auto" />
                                          </button>
                                        </TooltipTrigger>
                                        {!creditsData?.subscriptionTier || !["pro", "enterprise"].includes(creditsData.subscriptionTier) && (
                                          <TooltipContent>
                                            You must purchase a Pro subscription to use custom domains
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    </TooltipProvider>

                                    <Button
                                      onClick={handlePublish}
                                      disabled={isPublishing}
                                      className="w-full"
                                    >
                                      {isPublishing ? "Publishing..." : deployment?.deploymentUrl ? "Update Deployment" : "Publish Now"}
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-4 text-center">
                                    <p className="text-sm text-gray-500 italic">Configuration error</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* ─── EDIT DOMAIN VIEW ───────────────────────── */}
                            {publishView === "edit-domain" && deployment && (
                              <ViewTransition viewKey="edit-domain">
                                <div className="p-4 space-y-4">
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">Current</p>
                                    <p className="text-sm text-gray-600 break-all">
                                      {deployment.deploymentUrl}
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">New subdomain</label>
                                    <Input
                                      value={newSubdomain}
                                      onChange={(e) =>
                                        setNewSubdomain(
                                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                                        )
                                      }
                                      placeholder="your-site-name"
                                    />
                                    <p className="text-xs text-gray-500">
                                      Will be available at https://
                                      {newSubdomain || "your-site-name"}.falbor.xyz
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id="republish"
                                      checked={republishAfterUpdate}
                                      onChange={(e) => setRepublishAfterUpdate(e.target.checked)}
                                      className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <label htmlFor="republish" className="text-sm text-gray-700">
                                      Republish site after updating
                                    </label>
                                  </div>

                                  <Button
                                    onClick={handleUpdateDomain}
                                    disabled={
                                      isSavingDomain ||
                                      !newSubdomain.trim() ||
                                      newSubdomain === deployment.subdomain
                                    }
                                    className="w-full"
                                  >
                                    {isSavingDomain ? "Saving..." : "Save & Update"}
                                  </Button>
                                </div>
                              </ViewTransition>
                            )}

                            {/* ─── SITE META VIEW ─────────────────────────── */}
                            {publishView === "site-meta" && (
                              <ViewTransition viewKey="site-meta">
                                <div className="p-4 space-y-4">
                                  {/* Favicon upload */}
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Favicon (Tab Icon)</label>
                                    <div className="flex items-center gap-3">
                                      {siteMeta.favicon ? (
                                        <div className="relative w-10 h-10 border rounded flex items-center justify-center bg-gray-50">
                                          <img
                                            src={siteMeta.favicon}
                                            alt="Favicon preview"
                                            className="w-8 h-8 object-contain"
                                          />
                                          <button
                                            onClick={() =>
                                              setSiteMeta((p) => ({ ...p, favicon: null }))
                                            }
                                            className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5 cursor-pointer hover:bg-gray-100"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="w-10 h-10 border rounded flex items-center justify-center bg-gray-50 border-dashed">
                                          <ImageIcon className="w-5 h-5 text-gray-400" />
                                        </div>
                                      )}
                                      <button
                                        onClick={() => faviconInputRef.current?.click()}
                                        className="flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded hover:bg-gray-50 transition-colors cursor-pointer"
                                      >
                                        <Upload className="w-3.5 h-3.5" />
                                        Upload
                                      </button>
                                      <input
                                        ref={faviconInputRef}
                                        type="file"
                                        accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml"
                                        onChange={handleFaviconUpload}
                                        className="hidden"
                                      />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      .ico, .png, or .svg. Max 64KB.
                                    </p>
                                  </div>

                                  {/* Site title */}
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Tab Title</label>
                                    <Input
                                      value={siteMeta.siteTitle || ""}
                                      onChange={(e) =>
                                        setSiteMeta((p) => ({ ...p, siteTitle: e.target.value }))
                                      }
                                      placeholder="Falbor App"
                                      maxLength={100}
                                    />
                                    <p className="text-xs text-gray-500">
                                      Appears in the browser tab. Defaults to "Falbor App" if empty.
                                    </p>
                                  </div>

                                  {/* Description */}
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <textarea
                                      value={siteMeta.siteDescription || ""}
                                      onChange={(e) =>
                                        setSiteMeta((p) => ({
                                          ...p,
                                          siteDescription: e.target.value,
                                        }))
                                      }
                                      placeholder="A brief description of your site..."
                                      maxLength={500}
                                      rows={3}
                                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                    <p className="text-xs text-gray-500">
                                      SEO meta description. Auto-filled from project settings if
                                      available.
                                    </p>
                                  </div>

                                  <Button
                                    onClick={handleSaveMeta}
                                    disabled={isSavingMeta}
                                    className="w-full"
                                  >
                                    {isSavingMeta ? (
                                      <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                      </span>
                                    ) : (
                                      "Save Settings"
                                    )}
                                  </Button>
                                </div>
                              </ViewTransition>
                            )}

                            {/* ─── CUSTOM DOMAIN VIEW ─────────────────────── */}
                            {publishView === "custom-domain" && (
                              <ViewTransition viewKey="custom-domain">
                                <div className="p-4 space-y-4">
                                  {creditsData?.subscriptionTier &&
                                    ["pro", "enterprise"].includes(creditsData.subscriptionTier) ? (
                                    <>
                                      <p className="text-sm text-gray-600">
                                        Search for a domain to connect to your site.
                                      </p>
                                      <div className="flex gap-2">
                                        <Input
                                          value={domainQuery}
                                          onChange={(e) => setDomainQuery(e.target.value)}
                                          placeholder="example.com"
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleDomainSearch()
                                          }}
                                        />
                                        <Button
                                          onClick={handleDomainSearch}
                                          disabled={isSearchingDomains || !domainQuery.trim()}
                                          size="sm"
                                          className="px-3"
                                        >
                                          {isSearchingDomains ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Search className="w-4 h-4" />
                                          )}
                                        </Button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-center space-y-3 py-4">
                                      <Crown className="w-8 h-8 text-amber-500 mx-auto" />
                                      <p className="text-sm font-medium">Pro Feature</p>
                                      <p className="text-xs text-gray-500">
                                        Custom domains are available with a Pro subscription.
                                      </p>
                                      <Link href="/pricing">
                                        <Button size="sm" className="mt-2">
                                          Upgrade to Pro
                                        </Button>
                                      </Link>
                                    </div>
                                  )}
                                </div>
                              </ViewTransition>
                            )}

                            {/* ─── DOMAIN SEARCH RESULTS VIEW ─────────────── */}
                            {publishView === "domain-search-results" && (
                              <ViewTransition viewKey="domain-search-results">
                                <div className="p-4 space-y-3">
                                  {domainResults.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">
                                      No domains found. Try a different search.
                                    </p>
                                  ) : (
                                    <div className="space-y-2 max-h-72 overflow-y-auto">
                                      {domainResults.map((d) => (
                                        <div
                                          key={d.domain}
                                          className={cn(
                                            "flex items-center justify-between p-2.5 rounded-md border text-sm",
                                            d.available
                                              ? "border-gray-200 hover:border-gray-300"
                                              : "border-gray-100 bg-gray-50 opacity-60"
                                          )}
                                        >
                                          <div className="min-w-0 flex-1">
                                            <p className="font-medium truncate">{d.domain}</p>
                                            <p className="text-xs text-gray-500">
                                              {d.available ? (
                                                d.price > 0 ? (
                                                  `$${d.price.toFixed(2)}/yr`
                                                ) : (
                                                  "Price on request"
                                                )
                                              ) : (
                                                <span className="text-red-500">Unavailable</span>
                                              )}
                                            </p>
                                          </div>
                                          {d.available && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleSelectDomain(d)}
                                              className="ml-2 cursor-pointer"
                                            >
                                              Select
                                            </Button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </ViewTransition>
                            )}

                            {/* ─── DOMAIN CHECKOUT VIEW ───────────────────── */}
                            {publishView === "domain-checkout" && selectedDomain && (
                              <ViewTransition viewKey="domain-checkout">
                                <div className="p-5 space-y-5">
                                  {purchaseSuccess ? (
                                    <div className="text-center space-y-4 py-6">
                                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                                        <Check className="w-8 h-8 text-green-600" />
                                      </div>
                                      <p className="text-lg font-medium">Domain Purchased Successfully!</p>
                                      <p className="text-sm text-gray-600">
                                        {selectedDomain.domain} is now connected to your site.
                                      </p>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setPurchaseSuccess(false)
                                          setPublishView("main")
                                        }}
                                      >
                                        Back to Publish
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                                        <p className="text-sm font-medium">Order Summary</p>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-gray-700">{selectedDomain.domain}</span>
                                          <span className="font-semibold">
                                            {selectedDomain.price > 0
                                              ? `$${selectedDomain.price.toFixed(2)} / year`
                                              : <span className="text-red-600">Price unavailable</span>}
                                          </span>
                                        </div>
                                        <div className="border-t pt-3 flex justify-between text-base font-bold">
                                          <span>Total</span>
                                          <span>
                                            {selectedDomain.price > 0
                                              ? `$${selectedDomain.price.toFixed(2)}`
                                              : <span className="text-red-600">{"—"}</span>}
                                          </span>
                                        </div>
                                      </div>

                                      {selectedDomain.price <= 0 && (
                                        <Button
                                          variant="outline"
                                          className="w-full flex items-center justify-center gap-2"
                                          onClick={handleRefreshPrice}
                                          disabled={isRefreshingPrice}
                                        >
                                          {isRefreshingPrice ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <RefreshCw className="w-4 h-4" />
                                          )}
                                          Refresh Price
                                        </Button>
                                      )}

                                      {/* Official PayPal Buttons */}
                                      <PayPalScriptProvider
                                        options={{
                                          clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
                                          currency: "USD",
                                          intent: "capture",
                                          components: "buttons",
                                        }}
                                      >
                                        <PayPalButtonWrapper
                                          domain={selectedDomain.domain}
                                          price={selectedDomain.price}
                                          projectId={projectId}
                                          onSuccess={() => {
                                            setPurchaseSuccess(true)
                                            setIsPurchasing(false)
                                            if (deployment) {
                                              setDeployment({
                                                ...deployment,
                                                customDomain: selectedDomain.domain,
                                              })
                                            }
                                          }}
                                        />
                                      </PayPalScriptProvider>

                                      {isPurchasing && (
                                        <div className="flex items-center justify-center gap-2 py-4 text-gray-600">
                                          <Loader2 className="w-5 h-5 animate-spin" />
                                          Processing payment & domain registration...
                                        </div>
                                      )}

                                      <p className="text-xs text-gray-500 text-center pt-2">
                                        Secure payment processed by PayPal · Domain registered via GoDaddy
                                      </p>
                                    </>
                                  )}
                                </div>
                              </ViewTransition>
                            )}
                          </AnimatePresence>
                        </DropdownPanel>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === "profile" ? null : "profile")}
                    className="w-6 h-6 rounded-full overflow-hidden focus:outline-none cursor-pointer border border-transparent dark:border-white/10"
                  >
                    <img
                      src={user.imageUrl || "/placeholder.svg"}
                      alt={user.firstName || "User"}
                      className="w-full h-full object-cover"
                    />
                  </button>

                  <AnimatePresence>
                    {openDropdown === "profile" && (
                      <>
                        {/* <Backdrop onClick={closeDropdown} /> */}
                        <DropdownPanel className="w-60">
                          <div className="flex flex-col p-1">
                            {creditsData && (
                              <div className="hover:bg-gray-50 dark:hover:bg-[#2C2C30] rounded-sm p-1 flex items-center gap-3 w-full text-sm px-2 py-1.5 text-black/80 dark:text-white/90">
                                Next credits in{" "}
                                <span className="font-mono">
                                  {Math.floor(timeLeft / 60)}:
                                  {(timeLeft % 60).toString().padStart(2, "0")}
                                </span>
                              </div>
                            )}

                            <Link
                              href="/projects"
                              className="hover:bg-gray-50 dark:hover:bg-[#2C2C30] rounded-sm p-1 cursor-pointer transition-colors"
                            >
                              <button className="flex items-center gap-3 cursor-pointer w-full text-sm px-2 py-0.5 text-black/80 dark:text-white/90 rounded">
                                Projects
                              </button>
                            </Link>

                            <Link
                              href="/pricing"
                              className="hover:bg-gray-50 dark:hover:bg-[#2C2C30] rounded-sm p-1 cursor-pointer transition-colors"
                            >
                              <button className="flex items-center gap-3 cursor-pointer w-full text-sm px-2 py-0.5 text-black/80 dark:text-white/90 rounded">
                                Pricing
                              </button>
                            </Link>

                            <Link
                              href="/templates"
                              className="hover:bg-gray-50 dark:hover:bg-[#2C2C30] rounded-sm p-1 cursor-pointer transition-colors"
                            >
                              <button className="flex items-center gap-3 cursor-pointer w-full text-sm px-2 py-0.5 text-black/80 dark:text-white/90 rounded">
                                Templates
                              </button>
                            </Link>

                            <Link
                              href="/legal/terms"
                              className="hover:bg-gray-50 dark:hover:bg-[#2C2C30] rounded-sm p-1 cursor-pointer transition-colors"
                            >
                              <button className="flex items-center gap-3 cursor-pointer w-full text-sm px-2 py-0.5 text-black/80 dark:text-white/90 rounded">
                                Terms of Service
                              </button>
                            </Link>

                            <Link
                              href="/legal/privacy"
                              className="hover:bg-gray-50 dark:hover:bg-[#2C2C30] rounded-sm p-1 cursor-pointer transition-colors"
                            >
                              <button className="flex items-center gap-3 cursor-pointer w-full text-sm px-2 py-0.5 text-black/80 dark:text-white/90 rounded">
                                Privacy Policy
                              </button>
                            </Link>

                            <button
                              onClick={() => {
                                clerk.openUserProfile()
                                setOpenDropdown(null)
                              }}
                              className="flex items-center gap-3 w-full text-sm px-2 p-1 py-1.5 hover:bg-gray-50 dark:hover:bg-[#2C2C30] rounded-sm text-black/80 dark:text-white/90 cursor-pointer transition-colors"
                            >
                              Manage Account
                            </button>

                            <button
                              onClick={() => {
                                clerk.signOut()
                                setOpenDropdown(null)
                              }}
                              className="flex items-center gap-3 w-full text-sm px-2 py-1.5 p-1 text-black/80 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-[#2C2C30] rounded-sm cursor-pointer transition-colors"
                            >
                              Logout
                            </button>
                          </div>
                        </DropdownPanel>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <button className="text-sm font-medium text-white hover:text-gray-300">
                    Sign In
                  </button>
                </Link>
                <Link href="/sign-up">
                  <button className="text-sm font-medium px-4 py-1.5 rounded bg-[#ff8c00c0] hover:bg-[#ff8c00e0] text-white">
                    Sign Up
                  </button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
