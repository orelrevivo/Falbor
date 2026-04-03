"use client"

import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function ProfileCopyButton() {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = () => {
        const url = window.location.href
        navigator.clipboard.writeText(url)
        setCopied(true)
        toast.success("Profile link copied to clipboard!")
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Button variant="outline" size="sm" className="gap-2 h-8 bg-white border text-black hover:bg-white hover:text-black" onClick={copyToClipboard}>
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Profile Link"}
        </Button>
    )
}