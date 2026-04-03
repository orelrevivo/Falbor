"use client"

import { useRef, useState } from "react"
import { ChatInput, type ChatInputRef } from "@/components/layout/chat"
import { GithubClone } from "@/components/models/github-clone"
import { IdeasPanel } from "@/components/models/ideas-panel"

interface InputAreaProps {
  isAuthenticated: boolean
  initialMessage?: string
}

const EXAMPLE_PROMPTS = [
  { text: 'Build a todo app in React using Tailwind' },
  { text: 'Build a simple blog using Astro' },
  { text: 'Create a cookie consent form using Material UI' },
  { text: 'Make a space invaders game' },
  { text: 'How do I center a div?' },
];

export function InputArea({ isAuthenticated, initialMessage }: InputAreaProps) {
  const [showIdeas, setShowIdeas] = useState(false)
  const chatInputRef = useRef<ChatInputRef | null>(null)

  const handleSelectIdea = (prompt: string) => {
    chatInputRef.current?.insertPrompt(prompt)
  }

  const handleExampleClick = (text: string) => {
    // 1. Insert the prompt text into the textarea
    chatInputRef.current?.insertPrompt(text)

    // 2. After state settles, find the textarea and fire Enter to trigger handleSubmit
    setTimeout(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>(
        "form textarea"
      )
      if (textarea) {
        textarea.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            bubbles: true,
            cancelable: true,
          })
        )
      }
    }, 50)
  }

  return (
    <div className="w-full flex flex-col items-center">

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

      <div className="relative w-full flex justify-center">
        <div className="absolute top-0 mt-4 w-full flex flex-col items-center">

          <div id="examples" className="w-full max-w-xl flex justify-center">
            <div className="flex flex-col space-y-2 [mask-image:linear-gradient(to_bottom,black_0%,transparent_180%)] hover:[mask-image:none]">
              {EXAMPLE_PROMPTS.map((examplePrompt, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(examplePrompt.text)}
                  className="group flex items-center w-full gap-2 justify-center bg-transparent text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-theme"
                >
                  {examplePrompt.text}
                  <div className="i-ph:arrow-bend-down-left" />
                </button>
              ))}
            </div>
          </div>

          {!showIdeas && isAuthenticated && (
            <div className="flex flex-wrap justify-center items-center gap-3 mt-4 w-full px-4">
              <span className="text-[15px] text-[#202020a8]">
                or import from
              </span>
              <GithubClone />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}