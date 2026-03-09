// AutomationDialog.tsx
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Clock, ChevronDown, AlertCircle, MapPin, Zap, Database, Check, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { cn } from "@/lib/utils"
import { Badge } from "../ui/badge"
import Link from "next/link"

interface AutomationSettings {
  selectedModel: string
  dailyTime: string // "HH:MM:SS" UTC stored internally
  maxMessages: number
  isActive: boolean
  timezone: string
}

interface ModelOption {
  label: string
  icon: string
  color: string
  soon?: string
}

export type ModelType = "gemini" | "claude-sonnet-4.6" | "claude-opus-4.6" | "claude-haiku-4.5" | "glm-4.7-flash"

// SYNCED with ChatInput MODEL_OPTIONS
const CHAT_MODEL_OPTIONS: Record<ModelType, ModelOption> = {
  "gemini": { label: "Gemini 3.1 Pro", icon: "/icons/gemini.png", color: "text-blue-400" },
  "claude-sonnet-4.6": { label: "Claude Sonnet 4.6", icon: "/icons/claude.png", color: "text-purple-400" },
  "claude-opus-4.6": { label: "Claude Opus 4.6", icon: "/icons/claude.png", color: "text-purple-500" },
  "claude-haiku-4.5": { label: "Claude Haiku 4.5", icon: "/icons/claude.png", color: "text-purple-300" },
  "glm-4.7-flash": { label: "GLM 4.7 Flash", icon: "/icons/zAI.png", color: "text-teal-400" },
}

type DatabaseType = "falbor" | "supabase" | "none"

interface AutomationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  automationSettings: AutomationSettings | null
  onUpdateSettings: (updater: (prev: AutomationSettings) => AutomationSettings) => void
  onSave: () => void
  onTestNow: () => void
  loading: boolean
  modelOptions: Record<string, ModelOption>
  currentParsed: { hour: number; minute: number; second: number; timezone: string }
  onUpdateTime: (key: "hour" | "minute" | "second", val: number | string) => void
}

interface LocationInfo {
  country: string
  city?: string
  timezone: string
  localTime: { hour: number; minute: number }
}

export function AutomationDialog({
  open,
  onOpenChange,
  automationSettings,
  onUpdateSettings,
  onSave,
  onTestNow,
  loading,
  modelOptions,
  currentParsed,
  onUpdateTime,
}: AutomationDialogProps) {
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showHourDropdown, setShowHourDropdown] = useState(false)
  const [showMinuteDropdown, setShowMinuteDropdown] = useState(false)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const hourDropdownRef = useRef<HTMLDivElement>(null)
  const minuteDropdownRef = useRef<HTMLDivElement>(null)

  // Location state
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationSaved, setLocationSaved] = useState(false)

  // Database type selection
  const [selectedDbType, setSelectedDbType] = useState<DatabaseType>("falbor")

  // Local time state (displayed in user's local timezone)
  const [localHour, setLocalHour] = useState(currentParsed.hour)
  const [localMinute, setLocalMinute] = useState(currentParsed.minute)

  useEffect(() => {
    setLocalHour(currentParsed.hour)
    setLocalMinute(currentParsed.minute)
  }, [currentParsed.hour, currentParsed.minute])

  // Load saved location from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("automation-location")
    if (saved) {
      try {
        setLocationInfo(JSON.parse(saved))
        setLocationSaved(true)
      } catch { }
    }
  }, [])

  // Handle time changes using local timezone
  const handleTimeChange = useCallback((key: "hour" | "minute", val: number) => {
    if (!automationSettings) return
    const newHour = key === "hour" ? val : localHour
    const newMinute = key === "minute" ? val : localMinute
    if (key === "hour") setLocalHour(val)
    else setLocalMinute(val)

    // Convert local time to UTC for storage
    const now = new Date()
    const localDate = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(),
      newHour, newMinute, 0
    )
    const utcHour = localDate.getUTCHours().toString().padStart(2, "0")
    const utcMinute = localDate.getUTCMinutes().toString().padStart(2, "0")
    const utcStr = `${utcHour}:${utcMinute}:00`

    onUpdateSettings((prev) => ({ ...prev, dailyTime: utcStr }))
  }, [automationSettings, localHour, localMinute, onUpdateSettings])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false)
      }
      if (hourDropdownRef.current && !hourDropdownRef.current.contains(event.target as Node)) {
        setShowHourDropdown(false)
      }
      if (minuteDropdownRef.current && !minuteDropdownRef.current.contains(event.target as Node)) {
        setShowMinuteDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (!automationSettings) return null

  const handleModelChange = (model: ModelType) => {
    onUpdateSettings((prev) => ({ ...prev, selectedModel: model }))
    setShowModelDropdown(false)
  }

  const selectedOption = CHAT_MODEL_OPTIONS[automationSettings.selectedModel as ModelType] || CHAT_MODEL_OPTIONS["gemini"]

  // Detect location via IP-based API (more reliable, no permissions needed)
  const handleDetectLocation = async () => {
    setLocationLoading(true)
    setLocationError(null)

    try {
      // Use ipapi to get location from IP
      const res = await fetch("https://ipapi.co/json/")
      if (!res.ok) throw new Error("Failed to fetch location data")

      const data = await res.json()
      if (data.error) throw new Error(data.reason || "Location API error")

      const timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      const country = data.country_name || "Unknown"
      const city = data.city || ""

      const now = new Date()
      // Get local hour/minute for the detected timezone
      const localTimeStr = now.toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      const [h, m] = localTimeStr.split(":").map(Number)

      const info: LocationInfo = {
        country,
        city,
        timezone,
        localTime: { hour: h, minute: m },
      }

      setLocationInfo(info)
      setLocationSaved(true)
      localStorage.setItem("automation-location", JSON.stringify(info))

      // Update the automation time to current local time
      setLocalHour(h)
      setLocalMinute(m)
      handleTimeChange("hour", h)
      setTimeout(() => handleTimeChange("minute", m), 0)

      // Update timezone label
      onUpdateSettings((prev) => ({ ...prev, timezone }))
    } catch (err) {
      console.error(err)
      setLocationError("Could not determine location from IP.")
    } finally {
      setLocationLoading(false)
    }
  }

  // Full Auto: pick best model and database automatically
  const handleFullAuto = () => {
    // Auto-select: Gemini for general tasks, keep Falbor DB
    onUpdateSettings((prev) => ({
      ...prev,
      selectedModel: "gemini",
      isActive: true,
    }))
    setSelectedDbType("falbor")

    // Set time to now + 1 hour
    const now = new Date()
    const autoHour = (now.getHours() + 1) % 24
    setLocalHour(autoHour)
    handleTimeChange("hour", autoHour)
    handleTimeChange("minute", 0)
  }

  // Get user's local timezone label
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm overflow-y-auto bg-[#ffffff] border-0 p-0 sm:max-w-md">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-black text-xl flex items-center gap-2">
            AI Automation Settings
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="bg-[#e4e4e4b4] text-black">Beta</Badge>
              </TooltipTrigger>
              <TooltipContent className="w-50 p-3">
                <p className="text-[12px]">This Beta version may contain problems. We are here to solve them. If there is a problem, you can contact the
                  <span className="ml-1"><Link className="text-[#0099FF]" href={'/contact'}>Contact</Link> page.</span></p>
              </TooltipContent>
            </Tooltip>
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
          }}
          className="px-6 pb-6 space-y-5"
        >
          {/* ─── Full Auto Button ─── */}
          <div className="relative overflow-hidden rounded-xl border border-[#e4e4e4] bg-gradient-to-br from-[#f8f8ff] to-[#f0f4ff] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-[#0099FF]" />
                  <span className="text-sm font-semibold text-black">Full Automation Mode</span>
                </div>
                <p className="text-xs text-black/50">Let AI choose the best model, database, and settings automatically for you.</p>
              </div>
              <Button
                type="button"
                onClick={handleFullAuto}
                className="shrink-0 bg-[#0099FF] hover:bg-[#007acc] text-white text-xs px-4 h-8 rounded-lg"
                disabled={loading}
              >
                Auto Setup
              </Button>
            </div>
          </div>

          <div className="relative">
            {/* ─── Transparent Overlay if location is not saved ─── */}
            {!locationSaved && (
              <div className="absolute inset-0 z-40 bg-white/70 backdrop-blur-[2px] rounded-xl flex items-center justify-center p-6">
                <div className="bg-white border border-[#e4e4e4] shadow-lg rounded-xl p-6 text-center max-w-[280px]">
                  <MapPin className="w-8 h-8 text-[#0099FF] mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-black mb-1">Location Required</h3>
                  <p className="text-xs text-black/60 mb-4 leading-relaxed">
                    We need your location to automatically sync the timezone and time for your automation schedule.
                  </p>
                  {locationError && (
                    <p className="text-[10px] text-red-500 mb-3 bg-red-50 p-1.5 rounded">{locationError}</p>
                  )}
                  <Button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={locationLoading}
                    className="w-full bg-[#0099FF] hover:bg-[#007acc] text-white text-xs h-9 rounded-lg shadow-sm"
                  >
                    {locationLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</>
                    ) : (
                      "Connect Location"
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className={cn("space-y-5", !locationSaved && "opacity-30 pointer-events-none")}>
              {/* ─── Location Detector (when saved) ─── */}
              {locationSaved && locationInfo && (
                <div className="rounded-xl border border-[#e4e4e4] overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-black leading-tight truncate">
                        {locationInfo.city ? `${locationInfo.city}, ` : ""}{locationInfo.country}
                      </p>
                      <p className="text-[10px] text-black/50 truncate">{locationInfo.timezone}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLocationSaved(false)
                        setLocationInfo(null)
                        localStorage.removeItem("automation-location")
                      }}
                      className="h-7 px-2 text-xs text-black/40 hover:text-red-500"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── Model ─── */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-black block text-sm font-medium">Model</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="w-4 h-4 text-black/40" />
                    </TooltipTrigger>
                    <TooltipContent className="w-50 p-3">
                      <p className="text-[12px]">The model you select here will be used by the AI to generate the project.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative" ref={modelDropdownRef}>
                  <Button
                    type="button"
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="shadow-none w-full justify-start p-2 bg-[#e4e4e4b4] text-black hover:bg-[#e4e4e4] h-auto focus:outline-none focus:border-[#0099FF] focus:border-1 border border-[#e4e4e400]"
                    disabled={loading}
                    variant="ghost"
                  >
                    <img
                      src={selectedOption.icon || "/placeholder.svg"}
                      alt=""
                      className={`w-3.5 h-3.5 ${selectedOption.color} mr-2`}
                    />
                    <span className="text-black/75">{selectedOption.label}</span>
                    <ChevronDown className="w-3 h-3 text-black/50 ml-auto" />
                  </Button>

                  {showModelDropdown && (
                    <div className="absolute left-0 top-full bg-white border border-[#e0e0e0c9] rounded-md overflow-hidden p-1 z-50 w-full mt-1 shadow-md">
                      {Object.entries(CHAT_MODEL_OPTIONS).map(([key, option]) => {
                        const { label, icon, color } = option
                        const modelKey = key as ModelType
                        const isSelected = automationSettings.selectedModel === modelKey
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleModelChange(modelKey)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-sm hover:bg-[#e4e4e4] ${isSelected ? "font-bold" : ""}`}
                          >
                            <img src={icon || "/placeholder.svg"} alt="" className={`w-3.5 h-3.5 ${color}`} />
                            <span className="text-black/75">{label}</span>
                            {isSelected && <span className="ml-auto text-green-400">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Database Type ─── */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-black block text-sm font-medium">Database</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="w-4 h-4 text-black/40" />
                    </TooltipTrigger>
                    <TooltipContent className="w-50 p-3">
                      <p className="text-[12px]">Choose the database for auto-generated projects.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "falbor" as DatabaseType, label: "Falbor DB", icon: "/icons/falbor.png", desc: "Managed" },
                    { id: "supabase" as DatabaseType, label: "Supabase", icon: "/icons/supabase.png", desc: "Connect" },
                    { id: "none" as DatabaseType, label: "No DB", icon: "/icons/database-off.png", desc: "Serverless" },
                  ].map(({ id, label, icon, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedDbType(id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all text-center",
                        selectedDbType === id
                          ? "border-[#0099FF] bg-blue-50"
                          : "border-[#e4e4e4] bg-[#f9f9f9] hover:border-[#c0c0c0]"
                      )}
                    >
                      <img src={icon} alt={label} className="w-5 h-5 object-contain" />
                      <span className={cn("text-[10px] font-semibold", selectedDbType === id ? "text-[#0099FF]" : "text-black/60")}>{label}</span>
                      <span className="text-[9px] text-black/30">{desc}</span>
                      {selectedDbType === id && <Check className="w-3 h-3 text-[#0099FF]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Daily Time ─── */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-black block text-sm font-medium">
                    Daily Time
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="w-4 h-4 text-black/40" />
                    </TooltipTrigger>
                    <TooltipContent className="w-50 p-3">
                      <p className="text-[12px]">The selected time determines when the AI will start creating the project. Uses your local timezone.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {/* Hour */}
                  <div className="relative" ref={hourDropdownRef}>
                    <Button
                      type="button"
                      onClick={() => setShowHourDropdown(!showHourDropdown)}
                      className="shadow-none w-full justify-start p-2 bg-[#e4e4e4b4] text-black hover:bg-[#e4e4e4] h-auto text-sm focus:outline-none focus:border-[#0099FF] focus:border-1 border border-[#e4e4e400]"
                      disabled={loading}
                      variant="ghost"
                    >
                      <Clock className="w-3 h-3 mr-2 text-black/40" />
                      <span className="text-black/75">{localHour.toString().padStart(2, "0")}h</span>
                      <ChevronDown className="w-3 h-3 text-black/50 ml-auto" />
                    </Button>
                    {showHourDropdown && (
                      <div className="absolute left-0 top-full bg-[#ffffff] border border-[#e0e0e0c9] rounded-md overflow-hidden p-1 z-50 w-full max-h-40 overflow-y-auto shadow-md">
                        {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => {
                              handleTimeChange("hour", h)
                              setShowHourDropdown(false)
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm rounded-sm hover:bg-[#e4e4e4]"
                          >
                            <span className="text-black/75">{h.toString().padStart(2, "0")}:00</span>
                            {localHour === h && <span className="text-green-400">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Minute */}
                  <div className="relative" ref={minuteDropdownRef}>
                    <Button
                      type="button"
                      onClick={() => setShowMinuteDropdown(!showMinuteDropdown)}
                      className="shadow-none w-full justify-start p-2 bg-[#e4e4e4b4] text-black hover:bg-[#e4e4e4] h-auto text-sm focus:outline-none focus:border-[#0099FF] focus:border-1 border border-[#e4e4e400]"
                      disabled={loading}
                      variant="ghost"
                    >
                      <span className="text-black/75">{localMinute.toString().padStart(2, "0")}m</span>
                      <ChevronDown className="w-3 h-3 text-black/50 ml-auto" />
                    </Button>
                    {showMinuteDropdown && (
                      <div className="absolute left-0 top-full bg-[#ffffff] border border-[#e0e0e0c9] rounded-md overflow-hidden p-1 z-50 w-full max-h-40 overflow-y-auto shadow-md">
                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              handleTimeChange("minute", m)
                              setShowMinuteDropdown(false)
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm rounded-sm hover:bg-[#e4e4e4]"
                          >
                            <span className="text-black/75">:{m.toString().padStart(2, "0")}</span>
                            {localMinute === m && <span className="text-green-400">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-black/40 text-xs">
                  {locationInfo ? `${locationInfo.timezone}` : userTimezone} · Daily at {localHour.toString().padStart(2, "0")}:{localMinute.toString().padStart(2, "0")}
                </p>
              </div>

              {/* ─── Max Messages ─── */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-black block text-sm font-medium">Max Messages</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="w-4 h-4 text-black/40" />
                    </TooltipTrigger>
                    <TooltipContent className="w-50 p-3">
                      <p className="text-[12px]">The number you choose here will be the amount of messages the AI will create in the project.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={automationSettings.maxMessages}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({ ...prev, maxMessages: parseInt(e.target.value) || 2 }))
                  }
                  className="w-full p-2 bg-[#e4e4e4b4] text-black rounded focus:outline-none focus:border-[#0099FF] focus:border-1 border border-[#e4e4e400]"
                />
              </div>

              {/* ─── Active toggle ─── */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={automationSettings.isActive}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="rounded"
                />
                <label htmlFor="active" className="text-black text-sm">
                  Activate Daily Auto-Generation
                </label>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="px-6 pb-6 flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={onSave}
                disabled={loading}
                className="w-full bg-[#0099FF] hover:bg-[#007acc] text-white"
              >
                Create a project
              </Button>
            </TooltipTrigger>
            <TooltipContent className="w-50 p-3">
              <p className="text-[12px]">This will schedule your project to be built automatically from scratch every day at your chosen time. Costs are calculated based on the messages generated during the build process.</p>
            </TooltipContent>
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}