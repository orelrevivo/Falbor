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
  {
    label: "Build me a stunning SaaS landing page",
    prompt: `Build a production-ready SaaS landing page in React with Tailwind CSS.

Include:
- Hero section with a compelling headline, subheadline, and primary CTA button
- Social proof bar (logos or testimonial strip)
- Feature highlights: 3-column icon grid with titles and descriptions
- Pricing section: 3 tiers (Starter, Pro, Enterprise) with feature lists and CTA buttons
- FAQ accordion with smooth expand/collapse
- Footer with navigation links, social icons, and copyright

Requirements:
- Fully responsive (mobile-first)
- Smooth scroll-triggered section animations
- Clean, modern design system with consistent spacing and typography
- Use semantic HTML and accessible markup`,
  },
  {
    label: "Design a premium e-commerce product page",
    prompt: `Create a polished e-commerce product page in React with Tailwind CSS.

Include:
- Image gallery with main view and thumbnail row, supporting click-to-switch
- Product info: title, star rating, review count, price, and availability badge
- Variant selectors for size and color with active state styling
- Quantity stepper and Add to Cart button with loading state
- Tabbed content section: Description, Reviews, Shipping & Returns
- Related products grid at the bottom (4 cards)

Requirements:
- Mobile-responsive layout
- Smooth tab transitions
- Realistic placeholder data and images (use picsum or unsplash URLs)
- Accessible button and form elements`,
  },
  {
    label: "Create a powerful admin dashboard with analytics",
    prompt: `Build a comprehensive admin dashboard UI in React with Tailwind CSS.

Include:
- Collapsible sidebar with icon + label navigation items and active state
- Top header bar: search input, notification bell with badge, user avatar dropdown
- KPI cards row: Total Users, Monthly Revenue, Active Orders, Churn Rate — each with trend indicator
- Revenue line chart (use Recharts or a clean SVG-based chart)
- Recent transactions table: columns for user, amount, status badge, and date
- Dark mode toggle that persists via localStorage

Requirements:
- Responsive layout with sidebar collapsing to icon-only on mobile
- Consistent design tokens (colors, spacing, border radius)
- Realistic mock data throughout`,
  },
  {
    label: "Build a sleek AI-powered chat application",
    prompt: `Design a premium AI chat application interface in React with Tailwind CSS.

Include:
- Left panel: conversation history list with search, timestamps, and new chat button
- Main chat area: distinct message bubbles for user and assistant, with avatar icons
- Markdown rendering in assistant messages (support code blocks with syntax highlighting, bold, lists)
- Animated typing indicator (three bouncing dots)
- Sticky bottom input bar: auto-resizing textarea, send button, file attachment icon
- Model selector dropdown in the header (e.g. GPT-4o, Claude 3.5, Gemini 1.5)
- Empty state screen with 4 example prompt suggestion cards

Requirements:
- Dark theme with subtle gradients and glass-morphism accents
- Smooth message entry animations
- Mobile-responsive with collapsible sidebar`,
  },
  {
    label: "Craft a bold personal developer portfolio site",
    prompt: `Create a standout personal developer portfolio website in React with Tailwind CSS.

Include:
- Full-viewport hero with animated headline (typewriter or staggered reveal), role title, and CTA buttons (View Work / Contact)
- About section: short bio paragraph, profile photo placeholder, and tech stack icon grid
- Projects section: card grid with project image, title, short description, tags, and GitHub/Live links
- Experience timeline: role, company, date range, and bullet-point responsibilities
- Contact section: name, email, and message form with validation and success state
- Sticky top navigation with smooth scroll and active section highlighting

Requirements:
- Bold, memorable visual identity — avoid generic templates
- Strong typographic hierarchy with a distinctive display font
- Scroll-triggered section reveal animations
- Fully responsive`,
  },
]

export function InputArea({ isAuthenticated, initialMessage }: InputAreaProps) {
  const [showIdeas, setShowIdeas] = useState(false)
  const chatInputRef = useRef<ChatInputRef | null>(null)

  const handleSelectIdea = (prompt: string) => {
    chatInputRef.current?.insertPrompt(prompt)
  }

  const handleExampleClick = (prompt: string) => {
    chatInputRef.current?.insertPrompt(prompt)

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
              {EXAMPLE_PROMPTS.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example.prompt)}
                  className="group flex items-center w-full gap-2 justify-center bg-transparent text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-theme"
                >
                  {example.label}
                  <div className="i-ph:arrow-bend-down-left" />
                </button>
              ))}
            </div>
          </div>

          {!showIdeas && isAuthenticated && (
            <div className="flex flex-wrap justify-center items-center gap-3 mt-4 w-full px-4">
              <span className="text-[15px] dark:text-white/80 text-[#202020a8]">
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