"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Eye } from "lucide-react"

interface TemplateData {
  id: string
  projectId: string
  title: string
  description: string
  tags: string[]
  mainImage: string
  images: string[]
  domain: string
  creatorId: string
  createdAt: Date
  creatorName: string
  creatorImage: string | null
}

interface TemplatesGridProps {
  templates: TemplateData[]
}

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function TemplatesGrid({ templates }: TemplatesGridProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No templates available yet.</p>
        <p className="text-sm text-muted-foreground mt-1">Be the first to publish a template!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  )
}

function TemplateCard({ template }: { template: TemplateData }) {
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  // Truncate description to 100 characters
  const truncatedDescription =
    template.description.length > 100 ? `${template.description.slice(0, 100)}...` : template.description

  // Show only 2 tags, with a +X indicator if there are more
  const visibleTags = template.tags.slice(0, 2)
  const remainingTags = template.tags.length - 2

  const handleCardClick = () => {
    router.push(`/templates/${template.id}`)
  }

  return (
    <div
      className="cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Image Container */}
      <div className="relative aspect-video overflow-hidden bg-muted rounded-lg">
        <img
          src={template.mainImage || "/placeholder.svg"}
          alt={template.title}
          className="w-full h-full"
        />

        {/* Hover Overlay with Details Button */}
        <div
          className={`absolute inset-0 bg-white/70 flex items-center justify-center transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}
        >
          <div className="flex items-center gap-2 px-4 py-1 rounded-sm shadow-xs bg-white border text-foreground font-medium text-sm">
            <Eye className="w-4 h-4" />
            Details
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-foreground text-lg line-clamp-1">
          {template.title}
        </h3>

        {/* Creator Info */}
        <div
          className="flex items-center gap-2 mt-1 mb-3 hover:text-indigo-600 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/profile/${template.creatorId}`)
          }}
        >
          <Avatar className="h-5 w-5">
            <AvatarImage src={template.creatorImage || undefined} />
            <AvatarFallback className="text-[10px]">{template.creatorName.charAt(0)}</AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground line-clamp-1 truncate flex-1">{template.creatorName}</p>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {visibleTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {remainingTags > 0 && (
            <Badge variant="outline" className="text-xs border-none text-black">
              +{remainingTags}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
