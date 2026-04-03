"use client"

import { ChevronLeft, ChevronRight, RotateCcw, Monitor, Tablet, Smartphone, Minus, Plus, ChevronDown, Zap, Brain, Sparkles } from "lucide-react"
import { useState, useEffect } from "react"
import { DEVICE_PRESETS, DevicePreset } from "./device-presets"
import { cn } from "@/lib/utils"
import { useWorkbench } from "@/lib/workbench-context"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PreviewToolbarProps {
    url: string
    onRefresh: () => void
    selectedDevice: DevicePreset
    onDeviceChange: (device: DevicePreset) => void
    zoom: number
    onZoomChange: (zoom: number) => void
    onCheckPackages?: () => void
}

export function PreviewToolbar({
    url,
    onRefresh,
    selectedDevice,
    onDeviceChange,
    zoom,
    onZoomChange,
    onCheckPackages,
}: PreviewToolbarProps) {
    const { autoFixEnabled, setAutoFixEnabled } = useWorkbench()
    const [urlInput, setUrlInput] = useState(url)

    // Sync internal state with prop
    useEffect(() => {
        setUrlInput(url)
    }, [url])

    const handleZoomOut = () => onZoomChange(Math.max(50, zoom - 10))
    const handleZoomIn = () => onZoomChange(Math.min(150, zoom + 10))

    return (
        <div className="w-full flex items-center gap-2 p-1.5 border-b border-gray-200 bg-white">
            {/* Auto AI Fix Toggle */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => setAutoFixEnabled(!autoFixEnabled)}
                            className={cn(
                                "flex items-center gap-1.5 h-7 px-2.5 rounded-md transition-all duration-300 active:scale-95 border",
                                autoFixEnabled 
                                    ? "bg-purple-50 border-purple-200 text-purple-700 shadow-sm" 
                                    : "bg-gray-50 border-gray-200 text-gray-400 grayscale"
                            )}
                        >
                            <div className="relative">
                                <Brain className={cn("w-3.5 h-3.5", autoFixEnabled && "animate-pulse")} />
                                {autoFixEnabled && (
                                    <Sparkles className="w-2 h-2 absolute -top-1 -right-1 text-yellow-400 animate-bounce" />
                                )}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tight">Auto Fix</span>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{autoFixEnabled ? "Disable" : "Enable"} Automatic AI Error Correction</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <div className="w-px h-4 bg-gray-200 mx-1" />

            {/* URL Bar */}
            <div className="flex-1 relative flex items-center h-8">
                <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full h-7 px-3 pr-10 bg-white border border-gray-200 rounded-md text-xs font-mono text-gray-600 focus:outline-none focus:border-blue-500"
                    readOnly
                />
                <button
                    onClick={onRefresh}
                    className="absolute right-1 p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Reload"
                >
                    <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                </button>
            </div>

            {/* Check Packages Button */}
            {onCheckPackages && (
                <button
                    onClick={onCheckPackages}
                    className="flex items-center gap-1.5 h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all shadow-sm active:scale-95 group"
                    title="Check & Install Missing Packages"
                >
                    <Zap className="w-3 h-3 fill-current" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Check</span>
                </button>
            )}

            {/* Device Selector */}
            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1.5 h-7 cursor-pointer px-2 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-600 transition-colors">
                            {selectedDevice.type === "desktop" ? (
                                <Monitor className="w-3.5 h-3.5" />
                            ) : selectedDevice.type === "tablet" ? (
                                <Tablet className="w-3.5 h-3.5" />
                            ) : (
                                <Smartphone className="w-3.5 h-3.5" />
                            )}
                            {/* <span className="max-w-[60px] truncate hidden sm:inline">{selectedDevice.name}</span> */}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px] max-h-[400px] overflow-y-auto">
                        <DropdownMenuLabel className="text-[10px] uppercase text-gray-400 font-bold">Presets</DropdownMenuLabel>
                        {DEVICE_PRESETS.filter(d => d.type === "desktop").map(device => (
                            <DropdownMenuItem key={device.name} onClick={() => onDeviceChange(device)} className="text-xs">
                                <Monitor className="w-3.5 h-3.5 mr-2 opacity-60" />
                                {device.name}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[10px] uppercase text-gray-400 font-bold">Tablets</DropdownMenuLabel>
                        {DEVICE_PRESETS.filter(d => d.type === "tablet").map(device => (
                            <DropdownMenuItem key={device.name} onClick={() => onDeviceChange(device)} className="text-xs">
                                <Tablet className="w-3.5 h-3.5 mr-2 opacity-60" />
                                {device.name}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[10px] uppercase text-gray-400 font-bold">Phones</DropdownMenuLabel>
                        {DEVICE_PRESETS.filter(d => d.type === "phone").map(device => (
                            <DropdownMenuItem key={device.name} onClick={() => onDeviceChange(device)} className="text-xs">
                                <Smartphone className="w-3.5 h-3.5 mr-2 opacity-60" />
                                {device.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-white cursor-pointer border border-gray-200 rounded-md">
                <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                    className="p-1.5 hover:bg-gray-200 disabled:opacity-30 rounded-l-md transition-colors cursor-pointer"
                >
                    <Minus className="w-3.5 h-3.5 text-gray-600" />
                </button>
                <div className="w-10 text-center text-[9px] font-bold text-gray-600 border-l border-r border-gray-200">
                    {zoom}%
                </div>
                <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 150}
                    className="p-1.5 hover:bg-gray-200 disabled:opacity-30 rounded-r-md transition-colors cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5 text-gray-600" />
                </button>
            </div>
        </div>
    )
}
