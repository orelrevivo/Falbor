"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Shield, MoreVertical, Link2, Eye, EyeOff, Loader2, MoreHorizontal } from "lucide-react"
import { toggleProfilePrivacy } from "@/app/actions/user-profile"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ProfilePrivacyToggleProps {
    initialIsPrivate: boolean
    profileUrl: string
}

export function ProfilePrivacyToggle({ initialIsPrivate, profileUrl }: ProfilePrivacyToggleProps) {
    const [isPrivate, setIsPrivate] = useState(initialIsPrivate)
    const [isUpdating, setIsUpdating] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [pendingState, setPendingState] = useState(false)
    const router = useRouter()

    const handleCopyLink = () => {
        navigator.clipboard.writeText(profileUrl)
        toast.success("Profile link copied to clipboard")
    }

    const startToggle = (newState: boolean) => {
        setPendingState(newState)
        setShowConfirm(true)
    }

    const confirmToggle = async () => {
        setIsUpdating(true)
        setShowConfirm(false)
        try {
            const result = await toggleProfilePrivacy(pendingState)
            if (result.success) {
                setIsPrivate(pendingState)
                toast.success(`Profile is now ${pendingState ? "private" : "public"}`)
                router.refresh()
            } else {
                toast.error(result.error || "Failed to update privacy")
            }
        } catch (error) {
            toast.error("An unexpected error occurred")
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 bg-white/50 backdrop-blur-sm border-gray-200 hover:bg-white transition-all">
                        {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isPrivate ? (
                            <MoreHorizontal className="w-4 h-4 text-gray-800" />
                        ) : (
                            <MoreHorizontal className="w-4 h-4 text-gray-800" />
                        )}
                        <span className="hidden sm:inline text-sm text-zinc-800">{isPrivate ? "Private Profile" : "Public Profile"}</span>
                        <MoreVertical className="w-3 h-3 ml-1 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Profile Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
                        <Link2 className="w-4 h-4" />
                        Copy Profile Link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Privacy</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => startToggle(false)}
                        className="gap-2 cursor-pointer"
                        disabled={!isPrivate || isUpdating}
                    >
                        <Eye className="w-4 h-4" />
                        Set to Public
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => startToggle(true)}
                        className="gap-2 cursor-pointer"
                        disabled={isPrivate || isUpdating}
                    >
                        <EyeOff className="w-4 h-4" />
                        Set to Private
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Change Profile Privacy?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingState
                                ? "Making your profile private will hide it from others. Only you will be able to see your activity and templates."
                                : "Making your profile public will allow anyone with the link to see your profile, activity, and templates."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmToggle} className={pendingState ? "" : ""}>
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
