"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChatInput, type ChatInputRef } from "@/components/layout/chat"
import { IdeasPanel } from "@/components/models/ideas-panel"
import { Globe, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Badge } from "../ui/badge"

interface InputAreaProps {
  isAuthenticated: boolean
  initialMessage?: string
}

export function InputArea({ isAuthenticated, initialMessage }: InputAreaProps) {
  const router = useRouter()
  const [showIdeas, setShowIdeas] = useState(false)
  const chatInputRef = useRef<ChatInputRef | null>(null)

  const handleSelectIdea = (prompt: string) => {
    chatInputRef.current?.insertPrompt(prompt)
  }

  return (
    <div className="w-full flex flex-col items-center">

      <div className="w-full max-w-3xl">
        {isAuthenticated && (
          <div className="w-full flex justify-center mb-8 animate-fade-in relative z-20">
            <div className="group relative cursor-pointer">
              {/* Glowing Line */}
              <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-16 h-[2px] bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-400 rounded-full transition-all duration-500 ease-out group-hover:w-4/5 opacity-80 group-hover:opacity-100" />

              {/* Banner Body */}
              <Link href="https://arducode.vercel.app/" target="_blank">
                <div className="relative px-5 h-10 py-2 border-t-0 border-b-0 bg-white dark:bg-[#18181A] border border-black/20 dark:border-white/5 rounded- shadow-xs flex items-center gap-2.5 group-hover:shadow-md group-hover:-translate-y-0.5">
                  <Globe className="w-4 h-4 text-zinc-600 dark:text-zinc-400 stroke-[1.5]" />
                  <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 tracking-tight leading-none flex items-center gap-2">
                    <span>Meet our new AI platform for</span>
                    <div className="flex items-center gap-2 ml-[-20px] mr-[-10px]">
                      <img
                        src="/icons/arduino.png"
                        alt="Falbor"
                        className="h-[44px] w-auto flex-shrink-0"
                      /><span className="ml-[-22px]">now in <Badge>Beta</Badge>!</span>
                    </div>
                  </span>
                </div>
              </Link>
            </div>
          </div>
        )}

        {isAuthenticated && (
          <div className="z-10 flex flex-col items-start ml-[25px] mb-[-20px] pl-1 animate-fade-in">
            {/* Light mode image */}
            <img
              src="Falbor-logo-chat.png"
              alt="Logo"
              width={190}
              className="h-auto object-contain dark:hidden"
            />
            {/* Dark mode image */}
            <img
              src="Falbor-logo-chat-dark.png"
              alt="Logo"
              width={190}
              className="h-auto object-contain hidden dark:block"
            />
          </div>
        )}

        <ChatInput
          {...({ ref: chatInputRef } as any)}
          isAuthenticated={isAuthenticated}
          connected={showIdeas}
          onCloseIdeas={() => setShowIdeas(false)}
          initialMessage={initialMessage}
        />
      </div>

      {showIdeas && (
        <IdeasPanel onSelectIdea={handleSelectIdea} />
      )}

      <div className="relative w-full flex justify-center">
        <div className="absolute top-0 mt-4 w-full flex flex-col items-center">
        </div>
      </div>
    </div>
  )
}
