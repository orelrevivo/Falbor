"use client"

import { useRef, useState } from "react"
import { Lightbulb } from "lucide-react"
import { ChatInput, type ChatInputRef } from "@/components/layout/chat"
import { GithubClone } from "@/components/models/github-clone"
import { IdeasPanel } from "@/components/models/ideas-panel"

interface InputAreaProps {
  isAuthenticated: boolean
  initialMessage?: string
}

export function InputArea({ isAuthenticated, initialMessage }: InputAreaProps) {
  const [showIdeas, setShowIdeas] = useState(false)
  const chatInputRef = useRef<ChatInputRef | null>(null)

  const handleSelectIdea = (prompt: string) => {
    chatInputRef.current?.insertPrompt(prompt)
  }

  return (
    <div className="w-full flex flex-col items-center">
      {/* Chat Input (Wider + Centered) */}
      <div className="w-full max-w-3xl">
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

      {!showIdeas && isAuthenticated && (
        <div className="flex flex-wrap justify-center items-center gap-3 mt-4 w-full px-4">
          <span className="text-[15px] text-[#202020a8]">
            or import from
          </span>
          <GithubClone />
          <button
            onClick={() => setShowIdeas(true)}
            className="hidden sm:flex h-8 text-sm font-medium cursor-pointer border py-1 px-4 rounded-4xl text-black items-center gap-2"
          >
            <Lightbulb size={16} />
            <span className="font-sans font-light">Suggestions</span>
          </button>
        </div>
      )}
    </div>
  )
}
