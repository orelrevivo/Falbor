"use client"

import ApiKeyManager from "@/components/settings/api-keys/ApiKeyManager"
import { motion } from "framer-motion"

export default function ApiKeysPage() {
    return (
        <div className="flex flex-col gap-10 p-8 max-w-6xl mx-auto w-full min-h-screen animate-in fade-in duration-500">
            <ApiKeyManager />
        </div>
    )
}
