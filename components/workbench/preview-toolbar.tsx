"use client"

import { ChevronLeft, ChevronRight, RotateCcw, Monitor, Tablet, Smartphone, Minus, Plus, ChevronDown } from "lucide-react"
import { useState, useEffect } from "react"
import { DEVICE_PRESETS, DevicePreset } from "./device-presets"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

interface PreviewToolbarProps {
    url: string
    onRefresh: () => void
    selectedDevice: DevicePreset
    onDeviceChange: (device: DevicePreset) => void
    zoom: number
    onZoomChange: (zoom: number) => void
}

export function PreviewToolbar({
    url,
    onRefresh,
    selectedDevice,
    onDeviceChange,
    zoom,
    onZoomChange,
}: PreviewToolbarProps) {
    const [urlInput, setUrlInput] = useState(url)

    // Sync internal state with prop
    useEffect(() => {
        setUrlInput(url)
    }, [url])

    const handleZoomOut = () => onZoomChange(Math.max(50, zoom - 10))
    const handleZoomIn = () => onZoomChange(Math.min(150, zoom + 10))

    return (
        <div className="w-full flex items-center gap-2 p-1.5 border-b border-gray-200 bg-white">
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

            {/* Device Selector */}
            <div className="flex items-center gap-2">
                {/* {selectedDevice.type !== "desktop" && (
                    <div className="flex items-center gap-1">
                        <div className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-500">
                            {selectedDevice.width}
                        </div>
                        <div className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-500">
                            {selectedDevice.height}
                        </div>
                    </div>
                )} */}

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
                            <span className="max-w-[100px] truncate">{selectedDevice.name}</span>
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
                <div className="w-12 text-center text-[10px] font-bold text-gray-600 border-l border-r border-gray-200">
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
