"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Bell, Volume2, VolumeX, Loader2 } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { updateNotificationSettings } from "@/app/actions/user-profile"
import { toast } from "sonner"
import type { UserProfile } from "@/config/schema"

export function NotificationSettings({ initialProfile }: { initialProfile?: UserProfile | null }) {
    const [soundEnabled, setSoundEnabled] = useState(initialProfile?.notificationSoundEnabled ?? true)
    const [volume, setVolume] = useState(initialProfile?.notificationVolume ?? 100)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        // Fallback or override from local storage if needed, but server should be source of truth
        const saved = localStorage.getItem("falbor_bell_notification")
        if (saved !== null) {
            setSoundEnabled(saved === "true")
        }
        const savedVolume = localStorage.getItem("falbor_bell_volume")
        if (savedVolume !== null) {
            setVolume(parseInt(savedVolume, 10))
        }
    }, [])

    const toggleSound = (enabled: boolean) => {
        setSoundEnabled(enabled)
        localStorage.setItem("falbor_bell_notification", enabled.toString())
        if (enabled) {
            playTestSound(volume)
        }
    }

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0]
        setVolume(newVolume)
        localStorage.setItem("falbor_bell_volume", newVolume.toString())
        if (soundEnabled) {
            playTestSound(newVolume)
        }
    }

    const playTestSound = (vol: number) => {
        try {
            const audio = new Audio('/bell.mp3')
            audio.volume = vol / 100
            audio.play().catch(e => console.log("Audio play failed:", e))
        } catch (e) {
            console.log("Audio play failed:", e)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const result = await updateNotificationSettings({
                notificationSoundEnabled: soundEnabled,
                notificationVolume: volume
            })
            if (result.success) {
                toast.success("Notification settings saved successfully")
            } else {
                toast.error(result.error || "Failed to save settings")
            }
        } catch (error) {
            toast.error("An error occurred while saving")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Card className="shadow-xs rounded-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications
                </CardTitle>
                <CardDescription>
                    Configure how you want to be notified when the AI finishes its tasks.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-4">
                    <div className="flex flex-col space-y-1.5 flex-1">
                        <span className="text-sm font-medium leading-none flex items-center gap-2">
                            {soundEnabled ? (
                                <Volume2 className="w-4 h-4 text-green-500" />
                            ) : (
                                <VolumeX className="w-4 h-4 text-gray-400" />
                            )}
                            Completion Sound
                        </span>
                        <span className="text-sm text-muted-foreground">
                            Play a notification sound when the AI finishes generating code and responses. 
                            You&apos;ll hear a &quot;ding&quot; sound each time a response is complete.
                        </span>
                        <span className="text-xs text-muted-foreground/70">
                            Sound file: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">bell.mp3</code> (place in your public folder)
                        </span>
                    </div>
                    {/* On/Off Toggle Square */}
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden shadow-sm h-9">
                        <button
                            onClick={() => toggleSound(false)}
                            className={`px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                                !soundEnabled
                                    ? "bg-gray-900 text-white"
                                    : "bg-white text-gray-400 hover:bg-gray-50"
                            }`}
                        >
                            Off
                        </button>
                        <button
                            onClick={() => toggleSound(true)}
                            className={`px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                                soundEnabled
                                    ? "bg-green-500 text-white"
                                    : "bg-white text-gray-400 hover:bg-gray-50"
                            }`}
                        >
                            On
                        </button>
                    </div>
                </div>

                {soundEnabled && (
                    <div className="flex items-center justify-between space-x-4 pt-4 border-t border-gray-100">
                        <div className="flex flex-col space-y-1.5 flex-1">
                            <span className="text-sm font-medium leading-none">Volume</span>
                            <span className="text-sm text-muted-foreground">Adjust the loudness of the notification sound.</span>
                        </div>
                        <div className="flex items-center gap-4 w-[200px]">
                            <VolumeX className="w-4 h-4 text-gray-400" />
                            <Slider
                                value={[volume]}
                                onValueChange={handleVolumeChange}
                                max={100}
                                step={1}
                                className="flex-1"
                            />
                            <Volume2 className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-muted-foreground w-8 text-right">{volume}%</span>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Preferences
                </Button>
            </CardFooter>
        </Card>
    )
}
