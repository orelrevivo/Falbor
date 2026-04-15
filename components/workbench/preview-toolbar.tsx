"use client"

import {
    RotateCcw,
    Monitor,
    Tablet,
    Smartphone,
    Maximize2,
    FileText,
    Brain,
    Terminal
} from "lucide-react"
import { useState } from "react"
import { DEVICE_PRESETS, DevicePreset } from "./device-presets"
import { cn } from "@/lib/utils"
import { useWorkbench } from "@/lib/workbench-context"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip"

interface PreviewToolbarProps {
    url: string
    onRefresh: () => void
    selectedDevice: DevicePreset
    onDeviceChange: (device: DevicePreset) => void
    zoom: number
    onZoomChange: (zoom: number) => void
    onCheckPackages?: () => void
    pages?: string[]
    onToggleFullScreen?: () => void
    isFullScreen?: boolean
    onToggleTerminal?: () => void
}

export function PreviewToolbar({
    url,
    onRefresh,
    selectedDevice,
    onDeviceChange,
    zoom,
    onZoomChange,
    pages = ["/"],
    onToggleFullScreen,
    onToggleTerminal,
}: PreviewToolbarProps) {

    const [isOpen, setIsOpen] = useState(false)
    const { autoFixEnabled, setAutoFixEnabled } = useWorkbench()

    const getPath = (fullUrl: string) => {
        try {
            const urlObj = new URL(fullUrl)
            return urlObj.pathname || "/"
        } catch {
            return "/"
        }
    }

    const currentPath = getPath(url)

    return (
        <TooltipProvider>
            <div className="w-full flex items-center justify-center gap-4 px-2 relative">
                <div className="flex items-center gap-3 w-full justify-center">

                    <div
                        className={cn(
                            "flex items-center rounded-full px-3 h-9 transition-all duration-200 grow max-w-7xl min-w-[500px]",
                            "bg-[#F4F4F4] border border-gray-200 dark:bg-[#2C2C30] dark:border-[#2C2C30]",
                            isOpen
                                ? "border-[#0099ff] bg-white ring-2 ring-[#0099ff]/10 dark:bg-[#1E1E21] dark:border-[#0099ff]"
                                : "hover:border-gray-300 dark:hover:border-white/20"
                        )}
                    >

                        {/* Pages Dropdown */}
                        <DropdownMenu onOpenChange={setIsOpen}>
                            <DropdownMenuTrigger asChild>
                                <button className="flex-1 flex items-center gap-2 px-3 h-full text-left outline-none min-w-0">
                                    <span
                                        className={cn(
                                            "text-xs font-medium truncate transition-colors",
                                            isOpen ? "text-[#0099ff]" : "text-gray-500 dark:text-white/70"
                                        )}
                                    >
                                        {currentPath}
                                    </span>
                                </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent className="w-64 mt-1 shadow-2xl border-gray-100 rounded-xl p-1">

                                {/* FIX: unique keys */}
                                {pages.map((page, index) => (
                                    <DropdownMenuItem
                                        key={`${page}-${index}`}
                                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-[#0099ff]/5 hover:text-[#0099ff]"
                                        onClick={() => {
                                            window.dispatchEvent(
                                                new CustomEvent("preview-navigate", {
                                                    detail: { path: page }
                                                })
                                            )
                                        }}
                                    >
                                        <FileText className="w-3.5 h-3.5 opacity-60" />
                                        {page}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Right Actions */}
                        <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-gray-200 dark:border-white/10">

                            {/* Refresh */}
                            <button
                                onClick={onRefresh}
                                className="p-1.5 rounded-full text-gray-500 hover:text-[#0099ff] hover:bg-[#0099ff]/5 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {/* ✅ FIXED Device Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="p-1.5 rounded-full text-gray-500 hover:text-[#0099ff] hover:bg-[#0099ff]/5 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10">
                                        {selectedDevice.type === "desktop" ? (
                                            <Monitor className="w-3.5 h-3.5" />
                                        ) : selectedDevice.type === "tablet" ? (
                                            <Tablet className="w-3.5 h-3.5" />
                                        ) : (
                                            <Smartphone className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                    align="end"
                                    className="w-40 shadow-xl border-gray-100 rounded-xl p-1"
                                >
                                    {DEVICE_PRESETS.map((device, index) => (
                                        <DropdownMenuItem
                                            key={`${device.name}-${index}`}
                                            onClick={() => onDeviceChange(device)}
                                            className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg cursor-pointer"
                                        >
                                            {device.type === "desktop" ? (
                                                <Monitor className="w-4 h-4 opacity-50" />
                                            ) : device.type === "tablet" ? (
                                                <Tablet className="w-4 h-4 opacity-50" />
                                            ) : (
                                                <Smartphone className="w-4 h-4 opacity-50" />
                                            )}
                                            {device.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Fullscreen */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={onToggleFullScreen}
                                        className="p-1.5 rounded-full text-gray-500 hover:text-[#0099ff] hover:bg-[#0099ff]/5 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>Fullscreen</TooltipContent>
                            </Tooltip>

                            {/* Terminal */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={onToggleTerminal}
                                        className="p-1.5 rounded-full text-gray-500 hover:text-[#0099ff] hover:bg-[#0099ff]/5 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10"
                                    >
                                        <Terminal className="w-3.5 h-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>Terminal</TooltipContent>
                            </Tooltip>

                            {/* Auto Fix */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setAutoFixEnabled(!autoFixEnabled)}
                                        className={cn(
                                            "p-1.5 rounded-full transition-all",
                                            autoFixEnabled
                                                ? "bg-[#0099ff]/20 text-[#0099ff] dark:bg-[#0099ff]/30 dark:text-white"
                                                : "text-gray-500 hover:text-[#0099ff] hover:bg-[#0099ff]/5 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10"
                                        )}
                                    >
                                        <Brain className="w-4 h-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>Auto Fix</TooltipContent>
                            </Tooltip>

                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    )
}