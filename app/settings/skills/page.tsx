"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Wand2,
  Github,
  Search,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Video,
  Cloud,
  Plus,
  X,
  Check,
  ChevronRight,
  Loader2,
  Upload,
  FileJson,
  Zap,
  MessageSquare,
  ArrowRight,
  FolderOpen
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  getAllSkills,
  getUserSkills,
  enableSkill,
  disableSkill,
  getAvailableSkillsForUser,
  createCustomSkill
} from "@/app/actions/skills"
import { Skill, UserSkill } from "@/config/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

const iconMap: Record<string, React.ElementType> = {
  Sparkles,
  Wand2,
  Github,
  Search,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Video,
  Cloud,
  Zap,
  FileJson,
}

interface SkillWithUserData extends Skill {
  userSkillId?: string
  isEnabled?: boolean
}

export default function SkillsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [enabledSkills, setEnabledSkills] = useState<(UserSkill & { skill: Skill })[]>([])
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [isEnabling, setIsEnabling] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [newSkillName, setNewSkillName] = useState("")
  const [newSkillDescription, setNewSkillDescription] = useState("")
  const [newSkillInstructions, setNewSkillInstructions] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const fetchSkills = useCallback(async () => {
    setIsLoading(true)
    try {
      const [userSkillsData, availableData] = await Promise.all([
        getUserSkills(),
        getAvailableSkillsForUser(),
      ])
      setEnabledSkills(userSkillsData)
      setAvailableSkills(availableData)
    } catch (error) {
      console.error("Failed to fetch skills:", error)
      toast.error("Failed to load skills")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  const handleToggleSkill = async (skillId: string, userSkillId: string | undefined, currentState: boolean) => {
    try {
      if (currentState && userSkillId) {
        // Disable
        const result = await disableSkill(userSkillId)
        if (result.success) {
          toast.success("Skill disabled")
          await fetchSkills()
        } else {
          toast.error(result.error || "Failed to disable skill")
        }
      } else {
        // Enable
        setIsEnabling(true)
        const result = await enableSkill(skillId)
        if (result.success) {
          toast.success("Skill enabled successfully")
          await fetchSkills()
        } else {
          toast.error(result.error || "Failed to enable skill")
        }
      }
    } catch (error) {
      toast.error("Failed to toggle skill")
    } finally {
      setIsEnabling(false)
    }
  }

  const handleCreateWithAI = () => {
    // Navigate to landing page with the skill-creator message pre-filled in input
    router.push("/?message=Help me create a skill together using /skill-creator. First ask me what the skill should do.")
  }

  const handleInstallSkill = async (skill: Skill) => {
    try {
      setIsEnabling(true)
      const result = await enableSkill(skill.id)
      if (result.success) {
        toast.success(`"${skill.name}" installed successfully`)
        await fetchSkills()
      } else {
        toast.error(result.error || "Failed to install skill")
      }
    } catch (error) {
      toast.error("Failed to install skill")
    } finally {
      setIsEnabling(false)
    }
  }

  const handleCreateManualSkill = async () => {
    if (!newSkillName.trim()) {
      toast.error("Please enter a skill name")
      return
    }

    try {
      const result = await createCustomSkill({
        name: newSkillName,
        description: newSkillDescription,
        instructions: newSkillInstructions,
        icon: "Zap",
        category: "custom",
      })

      if (result && result.success) {
        toast.success("Custom skill created successfully")
        setIsCreateModalOpen(false)
        setNewSkillName("")
        setNewSkillDescription("")
        setNewSkillInstructions("")
        await fetchSkills()
      } else {
        toast.error(result?.error || "Failed to create skill")
      }
    } catch (error) {
      toast.error("Failed to create skill")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.name.endsWith('.json') || file.name.endsWith('.zip')) {
        setUploadedFile(file)
        toast.success(`File "${file.name}" selected`)
      } else {
        toast.error("Please upload a .json or .zip file")
      }
    }
  }

  const handleUploadSkill = async () => {
    if (!uploadedFile) {
      toast.error("Please select a file to upload")
      return
    }

    // TODO: Implement file parsing and skill creation from file
    toast.info("File upload feature coming soon!")
    setIsUploadModalOpen(false)
    setUploadedFile(null)
  }

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || Sparkles
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      content: "bg-purple-100 text-purple-700",
      analysis: "bg-blue-100 text-blue-700",
      productivity: "bg-green-100 text-green-700",
      development: "bg-orange-100 text-orange-700",
      system: "bg-gray-100 text-gray-700",
      custom: "bg-pink-100 text-pink-700",
    }
    return colors[category] || "bg-gray-100 text-gray-700"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Skills</h1>
          <p className="text-gray-600 mt-2">
            Enable specialized capabilities to extend what the AI can do for you
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCreateWithAI}
            className="bg-white hover:bg-white border text-gray-800"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Create with AI <Badge>Beta</Badge>
          </Button>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            variant="outline"
            className="bg-white hover:bg-white border text-gray-800"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Skill <Badge>Beta</Badge>
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            variant="outline"
            className="bg-[#0099ff]/20 text-[#0099ff] hover:bg-[#0099ff]/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Skill
          </Button>
          {/* <Button
            onClick={() => setIsLibraryOpen(true)}
            className="bg-black text-white hover:bg-gray-800"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Skills Library
          </Button> */}
        </div>
      </div>
      {/* Skills Grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {(() => {
              const allDisplaySkills = [
                ...enabledSkills.map(us => ({ ...us.skill, isInstalled: true, userSkillId: us.id })),
                ...availableSkills.map(s => ({ ...s, isInstalled: false }))
              ].sort((a, b) => a.name.localeCompare(b.name));

              return allDisplaySkills.map((skill) => {
                const Icon = getIconComponent(skill.icon)
                return (
                  <div className={`bg-[#dbd9d9b2] p-[5px] rounded-[9px]`}>
                    <motion.div
                      key={skill.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`group relative rounded-md p-6 transition-all h-full flex flex-col ${skill.isInstalled
                        ? 'bg-white border border-[#bebebd]'
                        : 'bg-white border border-[#bebebd]'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${getCategoryColor(skill.category)}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">
                              {skill.name}
                            </h3>
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                              {skill.category}
                            </span>
                          </div>
                        </div>
                        {skill.isInstalled && (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={true}
                              onCheckedChange={() => handleToggleSkill(skill.id, (skill as any).userSkillId, true)}
                              disabled={isEnabling}
                            />
                          </div>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6">
                        {skill.description}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-black hover:bg-gray-100"
                          onClick={() => setSelectedSkill(skill as Skill)}
                        >
                          View Details
                        </Button>

                        {skill.isInstalled ? (
                          <div className="flex items-center gap-2 bg-[#0099ff]/20 text-[#0099ff] hover:bg-[#0099ff]/30 px-3 py-1.5 rounded-lg text-sm font-semibold">
                            <Check className="w-4 h-4" />
                            Added
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleInstallSkill(skill as Skill)}
                            disabled={isEnabling}
                            className="bg-[#0099ff]/20 text-[#0099ff] hover:bg-[#0099ff]/30 px-6"
                          >
                            {isEnabling ? (
                              <div className="w-3 h-3 border-2 border-[#0099ff]/30 border-t-[#0099ff] rounded-full animate-spin" />
                            ) : (
                              "Install"
                            )}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )
              })
            })()}
          </AnimatePresence>
        </div>
      </div>

      {/* Skills Library Modal */}
      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Skills Library</DialogTitle>
            <DialogDescription>
              Discover and enable skills to extend your AI&apos;s capabilities
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {availableSkills.map((skill) => {
              const Icon = getIconComponent(skill.icon)

              return (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-lg p-5 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${getCategoryColor(skill.category)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                        <span className="text-xs text-gray-500 capitalize">
                          {skill.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    {skill.description}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => {
                        handleInstallSkill(skill)
                        setIsLibraryOpen(false)
                      }}
                      disabled={isEnabling}
                      size="sm"
                      className="flex-1 bg-black text-white hover:bg-gray-800"
                    >
                      {isEnabling ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Install
                    </Button>
                    <Button
                      onClick={() => setSelectedSkill(skill)}
                      variant="outline"
                      size="sm"
                    >
                      Details
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {availableSkills.length === 0 && (
            <div className="text-center py-8">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">All skills added!</h3>
              <p className="text-gray-600 mt-2">
                You&apos;ve added all available skills. Create custom skills or check back later for new additions.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Skill Detail Modal */}
      <Dialog open={!!selectedSkill && !isLibraryOpen} onOpenChange={() => setSelectedSkill(null)}>
        <DialogContent className="max-w-2xl">
          {selectedSkill && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${getCategoryColor(selectedSkill.category)}`}>
                    {(() => {
                      const Icon = getIconComponent(selectedSkill.icon)
                      return <Icon className="w-6 h-6" />
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedSkill.name}</DialogTitle>
                    <span className="text-sm text-gray-500 capitalize">
                      {selectedSkill.category}
                    </span>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedSkill.description}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">How it works</h4>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSkill.instructions}
                  </div>
                </div>

                {selectedSkill.modelConfig && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Configuration</h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                      <p><strong>Model:</strong> {selectedSkill.modelConfig.modelName}</p>
                      <p><strong>API Endpoint:</strong> {selectedSkill.modelConfig.apiEndpoint}</p>
                      {selectedSkill.modelConfig.apiKeyEnvVar && (
                        <p><strong>API Key:</strong> Uses environment variable {selectedSkill.modelConfig.apiKeyEnvVar}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Skill Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Create Custom Skill</DialogTitle>
            <DialogDescription>
              Add your own skill by providing the details below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skill Name *
              </label>
              <Input
                placeholder="e.g., My Custom Skill"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                placeholder="What does this skill do?"
                value={newSkillDescription}
                onChange={(e) => setNewSkillDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructions
              </label>
              <textarea
                className="w-full p-3 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[150px] text-sm"
                placeholder="Detailed instructions for how the AI should use this skill..."
                value={newSkillInstructions}
                onChange={(e) => setNewSkillInstructions(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-4 w-full">
              <Button
                onClick={handleCreateManualSkill}
                className="flex-1 bg-black w-[50%] bg-[#0099ff]/20 hover:bg-[#0099ff]/30 text-[#0099ff]"
              >
                Create Skill
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(false)}
                variant="outline"
                className="w-[50%] bg-white text-gray-800 hover:bg-white border"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Skill Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Upload Skill <Badge>Beta</Badge></DialogTitle>
            <DialogDescription>
              Upload a skill from a JSON file or ZIP archive
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.zip"
                className="hidden"
                onChange={handleFileUpload}
              />
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600">
                Click to select a file or drag and drop
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Supports .json and .zip files
              </p>
            </div>

            {uploadedFile && (
              <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                <FileJson className="w-8 h-8 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
            <div className="flex gap-2 pt-4 w-full">
              <Button
                onClick={handleUploadSkill}
                disabled={!uploadedFile}
                className="flex-1 bg-black w-[50%] bg-[#0099ff]/20 hover:bg-[#0099ff]/30 text-[#0099ff]"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload & Add Skill
              </Button>
              <Button
                onClick={() => {
                  setIsUploadModalOpen(false)
                  setUploadedFile(null)
                }}
                variant="outline"
                className="w-[50%] bg-white text-gray-800 hover:bg-white border"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
