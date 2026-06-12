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
            <div className="w-full flex items-center justify-center px-2">
                <div
                    className={cn(
                        "flex items-center justify-between gap-2 px-4 py-1.5 w-[380px] bg-zinc-50 dark:bg-[#1E1E22] border border-[#dbd9d965] dark:border-none hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-sm transition-all text-xs font-normal cursor-pointer select-none",
                        isOpen && "bg-zinc-100 dark:bg-zinc-800"
                    )}
                >
                    {/* Pages Dropdown */}
                    <DropdownMenu onOpenChange={setIsOpen}>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 outline-none min-w-0 text-zinc-400 dark:text-zinc-300 text-xs font-medium">
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate max-w-[80px]">{currentPath}</span>
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-64 mt-1 shadow-2xl border-gray-100 rounded-xl p-1">
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
                    <div className="flex items-center gap-0.5">
                        {/* Refresh */}
                        <button
                            onClick={onRefresh}
                            className="p-1 rounded-sm text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {/* Device Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded-sm text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
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
                                    className="p-1 rounded-sm text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
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
                                    className="p-1 rounded-sm text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
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
                                        "p-1 rounded-sm transition-colors",
                                        autoFixEnabled
                                            ? "text-[#0099ff] dark:text-white"
                                            : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10"
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
        </TooltipProvider>
    )
}