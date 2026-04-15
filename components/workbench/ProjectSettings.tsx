"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { CardContent } from "@/components/ui/card"
import { Loader2, Save, Trash2, Lock, Globe, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Project {
  id: string
  title: string
  description?: string | null
  coverImage?: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

interface ProjectSettingsProps {
  projectId: string
}

export default function ProjectSettings({ projectId }: ProjectSettingsProps) {
  const { isLoaded, isSignedIn } = useUser()

  const [project, setProject] = useState<Project | null>(null)
  const [tempProject, setTempProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const fetchProject = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/projects/${projectId}`, {
          credentials: "include",
        })

        if (!res.ok) throw new Error("Project not found")

        const data = await res.json()
        setProject(data)
        setTempProject(data)
      } catch {
        setError("Failed to load project")
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [projectId, isLoaded, isSignedIn])

  const updateTempField = (key: keyof Project, value: any) => {
    if (tempProject) {
      setTempProject({ ...tempProject, [key]: value })
    }
  }

  const handleSave = async () => {
    if (!tempProject) return
    setSaving(true)

    try {
      const payload = {
        description: tempProject.description,
        coverImage: tempProject.coverImage,
        isPublic: tempProject.isPublic,
      }

      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      })

      if (!res.ok) throw new Error("Save failed")

      setProject({ ...tempProject })
    } catch {
      setError("Failed to save project")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) throw new Error("Delete failed")

      window.location.href = "/projects"
    } catch {
      setError("Failed to delete project")
    } finally {
      setDeleting(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      alert("Upload failed")
      return
    }

    const data = await res.json()
    updateTempField("coverImage", data.url)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !project || !tempProject) {
    return <div className="text-center text-destructive py-12">{error}</div>
  }

  return (
    <div className="p-2 space-y-3">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">General</h2>
          <p className="text-xs font-mono dark:bg-[#2C2C30] px-2 py-1 rounded bg-[#e7e5df73]">{project.id}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-[8%] flex items-center justify-center  text-xs font-mono bg-[#e7e5df73] dark:bg-[#2C2C30] cursor-pointer px-2 py-1 rounded"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          <span className="w-full text-center">Save</span>
        </button>
      </div>

      {/* TITLE */}
      <div className="border border-[#e7e5d] bg-[#e7e5df73] dark:bg-[#2C2C30] rounded-md">
        <CardContent className="px-2 py-4">
          <h3 className="font-semibold mb-2 ml-1">Main chat title</h3>
          <p className="mb-2 ml-1 mt-[-8px] text-[12px]">
            Get access to your name chat
          </p>
          <div className="flex items-center rounded-md">
            <Input
              value={project.title}
              readOnly
              className="text-lg font-medium bg-white border-none dark:bg-[#000000ff]/40"
            />
          </div>
        </CardContent>
      </div>

      {/* DESCRIPTION */}
      <div className="border border-[#e7e5d] bg-[#e7e5df73] dark:bg-[#2C2C30] rounded-md">
        <CardContent className="px-2 py-4">
          <h3 className="font-semibold text-md mb-2 ml-1">Chat Description</h3>
          <div className="flex items-center rounded-md">
            <Textarea
              value={tempProject.description || ""}
              onChange={(e) => updateTempField("description", e.target.value)}
              className="dark:bg-[#000000ff]/40"
              rows={3}
              placeholder="Project description..."
            />
          </div>
        </CardContent>
      </div>

      {/* COVER IMAGE */}
      <div className="border border-[#e7e5d] bg-[#e7e5df73] dark:bg-[#2C2C30] rounded-md">
        <CardContent className="px-2 py-4">
          <h3 className="font-semibold text-md mb-2 ml-1">
            Upload a cover photo for the chat
          </h3>
          {tempProject.coverImage && (
            <img
              src={tempProject.coverImage}
              className="w-full h-32 object-cover rounded mb-2"
            />
          )}
          <div className="flex items-center rounded-md">
            <Input
              type="file"
              accept="image/*"
              className="dark:bg-[#000000ff]/40 w-fit"
              onChange={(e) =>
                e.target.files && handleImageUpload(e.target.files[0])
              }
            />
          </div>
        </CardContent>
      </div>

      {/* PROJECT VISIBILITY — DROPDOWN VERSION */}
      <div className="border border-[#e7e5d] bg-[#e7e5df73] dark:bg-[#2C2C30] rounded-md">
        <CardContent className="px-3.5 py-4">
          <h3 className="font-semibold text-md">Project Visibility</h3>
          <p className="mb-2 mt-[-3px] text-[12px]">
            Control who can access your chat
          </p>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-28 justify-between border bg-white hover:bg-white text-black dark:bg-[#000000ff]/40 dark:text-white/60 "
              >
                <span className="flex items-center gap-2">
                  {tempProject.isPublic ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {tempProject.isPublic ? "Public" : "Private"}
                </span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-48 shadow-xs">
              <DropdownMenuItem
                onClick={() => updateTempField("isPublic", false)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                Private
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => updateTempField("isPublic", true)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Globe className="h-4 w-4" />
                Public
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </div>

      {/* DELETE */}
      <div className="border border-[#e7e5d] bg-[#e7e5df73] dark:bg-[#2C2C30] rounded-md">
        <CardContent className="px-3.5 py-4">
          <h3 className="font-semibold text-md">Delete Project</h3>
          <p className="mb-2 text-[12px]">
            This action is permanent and cannot be undone.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-38 border bg-white dark:text-white hover:bg-white text-black cursor-pointer">
                <Trash2 className="h-4 w-4 mr-2" /> Delete Project
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl">
                  Delete Chat?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-lg">
                  You are about to delete {project.title}.
                </AlertDialogDescription>
                <AlertDialogDescription className="text-lg">
                  Are you sure you want to delete this chat?
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel className="">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </div>
    </div>
  )
}