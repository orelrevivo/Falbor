"use client"

import { useEffect, useState, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { motion, AnimatePresence } from "framer-motion"
import { MousePointer2 } from "lucide-react"
import Pusher from "pusher-js"
import { createPortal } from "react-dom"


interface Cursor {
  user_id: string
  name: string
  x: number
  y: number
  color: string
}

interface PresenceLayerProps {
  projectId: string
  onMessageReceived?: (data: any) => void
  onCursorUpdate?: (cursors: Record<string, Cursor>) => void
}

const COLORS = [
  "#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF3", 
  "#FF33A1", "#FFD733", "#33FFB5", "#8E33FF", "#FF8E33",
  "#00D2FF", "#9D50BB", "#6E48AA", "#FF4B2B", "#1f4037"
]

export function PresenceLayer({ projectId, onMessageReceived, onCursorUpdate }: PresenceLayerProps) {
  const { user } = useUser()
  const [cursors, setCursors] = useState<Record<string, Cursor>>({})
  const [pusher, setPusher] = useState<Pusher | null>(null)
  const [mounted, setMounted] = useState(false)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    setMounted(true)
    // Check if configuration exists
    if (!process.env.NEXT_PUBLIC_PUSHER_APP_KEY) {
        console.warn("[Presence] Pusher APP KEY missing in environment. Live features may be limited.")
        return
    }

    const client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
        authEndpoint: "/api/pusher/auth",
    })
    setPusher(client)

    return () => {
        client.disconnect()
    }
  }, [projectId])

  useEffect(() => {
    if (!pusher || !user) return

    const userColor = COLORS[Math.abs(user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % COLORS.length]
    const userName = user.firstName || user.username || "Anonymous"

    const channel = pusher.subscribe(`presence-project-${projectId}`)

    channel.bind("pusher:subscription_succeeded", () => {
        console.log(`[Presence] Subscribed to project ${projectId}`)
        // Members already in the channel
        const members = (channel as any).members || {}
        const newCursors: Record<string, Cursor> = {}
        
        Object.keys(members.members).forEach((id) => {
            if (id === user.id) return
            const info = members.members[id]
            newCursors[id] = {
                user_id: id,
                name: info.name,
                color: info.color || "#00D2FF",
                x: 0,
                y: 0
            }
        })
        setCursors(newCursors)
    })

    channel.bind("pusher:member_added", (member: any) => {
        if (member.id === user.id) return
        setCursors(prev => ({
            ...prev,
            [member.id]: {
                user_id: member.id,
                name: member.info.name,
                color: member.info.color || "#00D2FF",
                x: 0,
                y: 0
            }
        }))
    })

    channel.bind("pusher:member_removed", (member: any) => {
        setCursors(prev => {
            const next = { ...prev }
            delete next[member.id]
            return next
        })
    })

    // Listen for mouse moves via client events
    channel.bind("client-mouse-move", (data: any) => {
        if (data.user_id === user.id) return
        setCursors(prev => ({
            ...prev,
            [data.user_id]: {
                ...prev[data.user_id],
                ...data
            }
        }))
    })

    // Listen for chat events
    channel.bind("client-chat-event", (data: any) => {
        if (data.senderId === user.id) return
        onMessageReceived?.(data)
    })

    // Bridge for direct server broadcasts (not client events)
    channel.bind("server-chat-event", (data: any) => {
        if (data.senderId === user.id) return
        onMessageReceived?.(data)
    })

    channel.bind("pusher:subscription_error", (err: any) => {
        console.error(`[Presence] Subscription error for project ${projectId}:`, err)
    })

    channelRef.current = channel

    let lastSent = 0
    const THROTTLE_MS = 100 // Send mouse moves every 100ms (10 updates/sec)

    const handleMouseMove = (e: MouseEvent) => {
        const now = Date.now()
        if (now - lastSent < THROTTLE_MS) return
        lastSent = now

        const x = (e.clientX / window.innerWidth) * 100
        const y = (e.clientY / window.innerHeight) * 100
        
        // Only trigger if we are subscribed
        if ((channel as any).subscribed) {
            channel.trigger("client-mouse-move", {
                user_id: user.id,
                name: userName,
                color: userColor,
                x,
                y
            })
        }
    }

    window.addEventListener("mousemove", handleMouseMove)

    // Bridge for ChatInterface to broadcast via Pusher
    const handleGlobalBroadcast = async (e: any) => {
        if (!channelRef.current) return

        // We use our server-trigger API for chat events to be 100% reliable 
        // (bypasses "Client Events" restrictions in Pusher Dashboard)
        try {
            await fetch("/api/pusher/trigger", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    event: "client-chat-event", // Becomes server-chat-event in API
                    data: e.detail
                })
            })
        } catch (err) {
            console.error("[Presence] Chat broadcast failed:", err)
        }
    }
    window.addEventListener(`broadcast:${projectId}`, handleGlobalBroadcast)

    return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener(`broadcast:${projectId}`, handleGlobalBroadcast)
        pusher.unsubscribe(`presence-project-${projectId}`)
    }
  }, [pusher, user, projectId, onMessageReceived])

  if (!mounted || typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none">
      <AnimatePresence>
        {Object.values(cursors).map((cursor) => (
          <motion.div
            key={cursor.user_id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: 1,
              scale: 1,
              left: `${cursor.x}%`,
              top: `${cursor.y}%`,
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", damping: 35, stiffness: 300, mass: 0.5 }}
            className="absolute flex flex-col items-start gap-1 will-change-transform"
            style={{ 
              zIndex: 1000,
              pointerEvents: 'none'
            }}
          >
            <div className="relative pointer-events-none">
                <MousePointer2 
                  className="w-5 h-5 drop-shadow-md" 
                  style={{ fill: cursor.color, color: "white", strokeWidth: 1.5 }} 
                />
                <div 
                  className="absolute left-[18px] top-[18px] px-2 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-lg whitespace-nowrap backdrop-blur-md border border-white/20 select-none transition-colors"
                  style={{ backgroundColor: `${cursor.color}ee` }}
                >
                  {cursor.name}
                </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}

