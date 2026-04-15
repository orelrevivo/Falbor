"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Rocket, Sparkles, ChevronRight, Check, Share2, Copy, Edit3, Trash2, Facebook, Instagram, Twitter, MessageSquare, Loader2, Image as ImageIcon, Send, ArrowRight, Zap, RefreshCw, Smartphone, Linkedin as LinkedinIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { TextShimmer } from "@/components/ui/text-shimmer"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "../ui/badge"

interface Question {
   id: number
   question: string
   answer: string
   options?: Array<{ title: string; subtitle: string }>
}

interface Post {
   id: string
   platform: string
   title?: string
   content: string
   imageUrl: string
   imagePrompt: string
}

interface SushiData {
   id?: string
   status: "idle" | "loading_questions" | "answered" | "generating_posts" | "completed"
   questions: Question[]
   strategy?: string
   platforms: string[]
   posts: Post[]
}

export function SushiSection({ projectId }: { projectId: string }) {
   const [data, setData] = useState<SushiData | null>(null)
   const [loading, setLoading] = useState(true)
   const [currentStep, setCurrentStep] = useState(0)
   const [isGenerating, setIsGenerating] = useState(false)
   const [editModal, setEditModal] = useState<{ open: boolean; post: Post | null }>({ open: false, post: null })

   useEffect(() => {
      fetchData()
   }, [projectId])

   const fetchData = async () => {
      try {
         const res = await fetch(`/api/projects/${projectId}/sushi`)
         const json = await res.json()
         setData(json)
         setLoading(false)
      } catch (e) {
         console.error("[Sushi] Fetch error:", e)
         setLoading(false)
      }
   }

   const saveData = async (newData: any) => {
      try {
         const res = await fetch(`/api/projects/${projectId}/sushi`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newData),
         })
         const saved = await res.json()
         setData(saved)
      } catch (e) {
         toast.error("Failed to save progress")
      }
   }

   const handleStart = async () => {
      setData((prev) => prev ? { ...prev, status: "loading_questions" } : null)
      try {
         const res = await fetch("/api/sushi/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId }),
         })
         const questions = await res.json()
         const newData: SushiData = {
            ...data!,
            questions: questions.map((q: any) => ({ ...q, answer: "" })),
            status: "answered",
         }
         await saveData(newData)
      } catch (e) {
         toast.error("Failed to load strategy questions")
         setData((prev) => prev ? { ...prev, status: "idle" } : null)
      }
   }

   const handleAnswer = async (id: number, answer: string) => {
      if (!data) return
      const newQuestions = data.questions.map((q) => q.id === id ? { ...q, answer } : q)
      const newData = { ...data, questions: newQuestions }
      setData(newData)

      if (id < 3) {
         setCurrentStep(id)
      } else {
         // All answered, proceed to generation or summary step
         // For now, let's just save and show generation
      }
   }

   const handleGeneratePosts = async () => {
      setIsGenerating(true)
      setData((prev) => prev ? { ...prev, status: "generating_posts" } : null)
      try {
         const res = await fetch("/api/sushi/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, questions: data?.questions, platforms: data?.platforms }),
         })
         const posts = await res.json()
         const newData: SushiData = {
            ...data!,
            posts,
            status: "completed",
         }
         await saveData(newData)
         setIsGenerating(false)
      } catch (e) {
         toast.error("Failed to generate posts")
         setData((prev) => prev ? { ...prev, status: "answered" } : null)
         setIsGenerating(false)
      }
   }

   if (loading) {
      return (
         <div className="flex flex-col items-center justify-center h-[500px] gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#0099ff]" />
            <TextShimmer>Loading your social workspace...</TextShimmer>
         </div>
      )
   }

   if (!data || data.status === "idle") {
      return (
         <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#1E1E21] rounded-4xl">
            <div className="flex flex-1">
               {/* Left Side: Illustration & Text */}
               <div className="flex-1 p-12 flex flex-col justify-center gap-6">
                  <Badge className="w-fit">
                     New Social Content
                  </Badge>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                     Transform your project into <span className="text-[#0099ff]">Social Content</span> in seconds.
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-white/60 max-w-md">
                     Social Content analyzes your app's purpose, target audience, and code to create high-performing posts for Instagram, TikTok, and LinkedIn.
                  </p>
                  <div className="flex flex-col gap-4 mt-4">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-900 dark:text-white">
                           <Check className="w-5 h-5" />
                        </div>
                        <span className="text-gray-900 dark:text-white/80">Auto-generated images and copy</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-900 dark:text-white">
                           <Check className="w-5 h-5" />
                        </div>
                        <span className="text-gray-900 dark:text-white/80">Multi-platform specific formats</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-900 dark:text-white">
                           <Check className="w-5 h-5" />
                        </div>
                        <span className="text-gray-900 dark:text-white/80">AI-driven marketing strategy</span>
                     </div>
                  </div>
                  <Button
                     onClick={handleStart}
                     className="mt-8 bg-[#0099ff] hover:bg-[#007cd0] text-white rounded-sm text-sm w-fit"
                  >
                     Get Started
                     <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
               </div>

               {/* Right Side: Visual Showcase */}
               <div className="flex-1 relative overflow-hidden bg-[#e7e5df] dark:bg-[#111114] rounded-4xl">
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                     <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white dark:bg-blue-900 rounded-full blur-3xl animate-pulse" />
                     <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-400 dark:bg-blue-600 rounded-full blur-3xl animate-pulse" />
                  </div>
                  <div className="h-full flex items-center justify-center p-12">
                     <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="relative z-10 w-full max-w-sm aspect-[9/16] bg-white dark:bg-[#1E1E21] rounded-[40px] shadow-2xl border-8 border-slate-900 dark:border-black overflow-hidden"
                     >
                        <div className="h-12 border-b border-slate-100 dark:border-white/5 flex items-center px-6 gap-2">
                           <div className="w-8 h-2 bg-slate-200 dark:bg-white/10 rounded-full" />
                           <div className="flex-1" />
                           <Smartphone className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 overflow-y-auto pb-4">
                           <div className="p-4">
                              <div className="w-full aspect-square bg-slate-100 dark:bg-white/5 rounded-xl mb-4 overflow-hidden">
                                 <div className="w-full h-full bg-gradient-to-tr from-orange-400 to-pink-500 animate-pulse opacity-80" />
                              </div>
                              <div className="space-y-2">
                                 <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                 <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-3/4" />
                                 <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-1/2" />
                              </div>
                           </div>
                        </div>
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-200 dark:bg-white/10 rounded-full" />
                     </motion.div>
                  </div>
               </div>
            </div>
         </div>
      )
   }

   if (data.status === "loading_questions") {
      return (
         <div className="flex flex-col items-center justify-center h-full gap-8 border py-30 rounded-xl">
            <div className="text-center space-y-2">
               <TextShimmer className="text-lg">Analyzing your project...</TextShimmer>
               <br />
               <span className="text-gray-500 text-sm">Building a custom social strategy based on your codebase</span>
            </div>
         </div>
      )
   }

   if (data.status === "answered" || (data.status === "completed" && (!data.posts || data.posts.length === 0))) {
      const question = data.questions[currentStep]
      return (
         <div className="flex flex-col h-full border dark:border-white/10 rounded-xl bg-white dark:bg-[#1E1E21]">
            <div className="max-w-3xl mx-auto w-full py-12 px-6">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <div className="space-y-1">
                        <h3 className="text-gray-900 dark:text-white">Step {currentStep + 1} of 3</h3>
                     </div>
                  </div>
               </div>

               <AnimatePresence mode="wait">
                  <motion.div
                     key={currentStep}
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -20 }}
                  >
                     <h2 className="text-md text-gray-900 dark:text-white mb-3">{question.question}</h2>
                     <div className="grid grid-cols-1 gap-1">
                        {question.options?.map((option, idx) => (
                           <button
                              key={idx}
                              onClick={() => handleAnswer(question.id, option.title)}
                              className={cn(
                                 "flex flex-col items-start p-4 rounded-sm border dark:border-white/10 text-left transition-all",
                                 question.answer === option.title
                                    ? "border-[#0099ff] bg-[#0099ff]/5 dark:bg-[#0099ff]/10"
                                    : "bg-white dark:bg-[#111114] hover:border-slate-200 dark:hover:border-white/20"
                              )}
                           >
                              <div className="flex items-center justify-between w-full">
                                 <span className="font-bold text-sm text-slate-900 dark:text-white">{option.title}</span>
                                 <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                    question.answer === option.title ? "bg-[#0099ff] border-[#0099ff]" : "border-slate-200 dark:border-white/10"
                                 )}>
                                    {question.answer === option.title && <Check className="w-4 h-4 text-white" />}
                                 </div>
                              </div>
                              <p className="text-slate-500 dark:text-white/40 text-xs">{option.subtitle}</p>
                           </button>
                        ))}
                     </div>

                     <div className="flex justify-end mt-1 gap-1">
                        {currentStep > 0 && (
                           <Button variant="outline" className="rounded-sm w-fit h-7 bg-white dark:bg-[#111114] border dark:border-white/10 text-black dark:text-white hover:bg-white/90 dark:hover:bg-white/5 font-normal" onClick={() => setCurrentStep(prev => prev - 1)}>
                              Back
                           </Button>
                        )}
                        {question.answer && (
                           <Button
                              onClick={currentStep < 2 ? () => setCurrentStep(prev => prev + 1) : handleGeneratePosts}
                              className="bg-[#0099ff] hover:bg-[#007cd0] text-white rounded-sm w-fit h-7 font-normal"
                              disabled={isGenerating}
                           >
                              {currentStep < 2 ? "Continue" : "Generate Social Posts"}
                              {currentStep === 2 && <ArrowRight className="ml-2 w-5 h-5" />}
                           </Button>
                        )}
                     </div>
                  </motion.div>
               </AnimatePresence>
            </div>
         </div>
      )
   }

   if (data.status === "generating_posts") {
      return (
         <div className="flex flex-col items-center justify-center h-full border rounded-xl px-6">
            <div className="w-full max-w-md space-y-6 mt-2 mb-2">
               <div className="relative h-2 w-full bg-[#e7e5df] rounded-full overflow-hidden">
                  <motion.div
                     className="absolute inset-y-0 left-0 bg-[#0099ff]/40"
                     initial={{ width: "0%" }}
                     animate={{ width: ["10%", "30%", "45%", "60%", "85%", "95%"] }}
                     transition={{ duration: 15, ease: "easeInOut" }}
                  />
               </div>
               <div className="space-y-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                     <TextShimmer className="text-xl">Social Content is cooking...</TextShimmer>
                  </div>
                  <div className="space-y-3">
                     <div className="flex flex-col gap-2">
                        <span className="text-gray-500">Brewing catchy captions...</span>
                        <span className="text-gray-500">Optimizing for platform reach...</span>
                        <span className="text-gray-500">Finalizing layout design...</span>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-6 opacity-40">
                  <div className="aspect-[9/16] rounded-xl bg-[#e7e5df] animate-pulse" />
                  <div className="aspect-[9/13] rounded-xl bg-[#e7e5df] animate-pulse" />
                  <div className="aspect-[9/16] rounded-xl bg-[#e7e5df] animate-pulse" />
               </div>
            </div>
         </div>
      )
   }

   return (
      <div className="flex flex-col h-full w-full overflow-y-auto bg-white dark:bg-[#1E1E21]">
         <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#1E1E21]/80 backdrop-blur-md px-8 py-4 flex items-center justify-between border-b dark:border-white/5">
            <div className="flex items-center gap-3">
               <div>
                  <TextShimmer className="">Your Social Content</TextShimmer>
                  <p className="text-gray-500 dark:text-white/40 text-xs">{data.posts?.length} posts generated</p>
                  <p className="text-gray-500 dark:text-white/40 text-xs">Creation img coming soon...</p>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" onClick={() => setData({ ...data, status: "idle" })} className="rounded-sm w-fit h-7 bg-white dark:bg-[#111114] border dark:border-white/10 text-black dark:text-white hover:bg-white/90 dark:hover:bg-white/5 font-normal">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Start Over
               </Button>
            </div>
         </div>

         <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {(data.posts || []).length > 0 ? (data.posts || []).map((post) => (
               <div key={post.id} className="bg-white dark:bg-[#1E1E21] rounded-sm shadow-xs border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300">
                  <div className="px-6 py-4 border-b border-slate-50 dark:border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        {(post.platform === "LinkedIn" || post.platform === "Facebook") && <LinkedinIcon className="w-5 h-5 text-blue-600" />}
                        {post.id.includes("instagram") && <Instagram className="w-5 h-5 text-pink-600" />}
                        {post.id.includes("tiktok") && <Smartphone className="w-5 h-5 text-black dark:text-white" />}
                        <span className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-white/80">{post.platform}</span>
                     </div>
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500 dark:text-white/40" onClick={() => setEditModal({ open: true, post })}>
                           <Edit3 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-500">
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                     <div className="flex-1 rounded-sm p-4 mb-6 border dark:border-white/10 text-slate-700 dark:text-white/70 text-sm leading-relaxed whitespace-pre-wrap italic bg-slate-50 dark:bg-[#111114]/50">
                        "{post.content}"
                     </div>

                     <div className="flex gap-2">
                        <Button
                           variant="outline"
                           className="rounded-sm w-fit h-7 bg-white dark:bg-[#111114] border dark:border-white/10 text-black dark:text-white hover:bg-white/90 dark:hover:bg-white/5 font-normal"
                           onClick={() => {
                              navigator.clipboard.writeText(post.content)
                              toast.success(`Copied to clipboard!`)
                           }}
                        >
                           <Copy className="w-4 h-4 mr-2" />
                           Copy
                        </Button>
                        <Button
                           className="bg-[#0099ff] hover:bg-[#007cd0] text-white rounded-sm w-fit h-7 font-normal"
                           onClick={() => {
                              const urls: Record<string, string> = {
                                 Instagram: "https://instagram.com",
                                 LinkedIn: `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(post.content)}`,
                                 Facebook: `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(post.content)}`,
                                 TikTok: "https://tiktok.com"
                              }
                              if (post.platform === "LinkedIn") {
                                 toast.success("Opening LinkedIn with your post ready!")
                              } else {
                                 toast.info(`Download the image and paste the text on ${post.platform}`)
                              }
                              window.open(urls[post.platform] || "https://google.com", "_blank")
                           }}
                        >
                           <Share2 className="w-4 h-4 mr-2" />
                           Open Site
                        </Button>
                     </div>
                  </div>
               </div>
            )) : (
               <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                     <Sparkles className="w-10 h-10 text-slate-300 dark:text-white/20" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white">No posts generated yet</h3>
                     <p className="text-slate-500 dark:text-white/40 max-w-sm mx-auto">The AI strategist didn't output any content. Try regenerating the pack with a different tone.</p>
                  </div>
                  <Button onClick={handleGeneratePosts} className="bg-[#0099ff] hover:bg-[#007cd0] rounded-full px-8">
                     Regenerate Pack
                  </Button>
               </div>
            )}
         </div>
         {/* Edit Modal (Dialog) */}
         <AnimatePresence>
            {editModal.open && editModal.post && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                     onClick={() => setEditModal({ open: false, post: null })}
                  />
                  <motion.div
                     initial={{ scale: 0.95, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.95, opacity: 0 }}
                     className="relative w-full max-w-4xl bg-white dark:bg-[#1E1E21] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-full max-h-[80vh] border dark:border-white/10"
                  >
                     <div className="flex-1 bg-slate-900 dark:bg-black flex items-center justify-center p-8">
                        <div className="relative aspect-square w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl">
                           <img src={editModal.post.imageUrl} className="w-full h-full object-cover" />
                           <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-2">
                              <Button
                                 size="sm"
                                 onClick={() => {
                                    const input = document.createElement("input")
                                    input.type = "file"
                                    input.accept = "image/*"
                                    input.onchange = async (e) => {
                                       const file = (e.target as HTMLInputElement).files?.[0]
                                       if (file) {
                                          const reader = new FileReader()
                                          reader.onload = (e) => {
                                             const newPost = { ...editModal.post!, imageUrl: e.target?.result as string }
                                             setEditModal({ ...editModal, post: newPost })
                                          }
                                          reader.readAsDataURL(file)
                                       }
                                    }
                                    input.click()
                                 }}
                                 className="bg-white/10 hover:bg-white/20 backdrop-blur-md border-white/20 text-white rounded-full"
                              >
                                 <ImageIcon className="w-4 h-4 mr-2" />
                                 Upload
                              </Button>
                              <Button size="sm" className="bg-white/10 hover:bg-white/20 backdrop-blur-md border-white/20 text-white rounded-full" onClick={async () => {
                                 const loadingToast = toast.loading("AI is generating a new image...")
                                 try {
                                    const res = await fetch("/api/sushi/generate", {
                                       method: "POST",
                                       headers: { "Content-Type": "application/json" },
                                       body: JSON.stringify({
                                          projectId,
                                          questions: data?.questions,
                                          platforms: [editModal.post!.platform]
                                       }),
                                    })
                                    const posts = await res.json()
                                    if (posts && posts.length > 0) {
                                       const newPost = { ...editModal.post!, imageUrl: posts[0].imageUrl }
                                       setEditModal({ ...editModal, post: newPost, open: true })
                                       toast.success("New image generated!", { id: loadingToast })
                                    } else {
                                       toast.error("Failed to generate new image", { id: loadingToast })
                                    }
                                 } catch (e) {
                                    toast.error("Error generating image", { id: loadingToast })
                                 }
                              }}>
                                 <RefreshCw className="w-4 h-4 mr-2" />
                                 Regenerate
                              </Button>
                           </div>
                        </div>
                     </div>
                     <div className="w-full md:w-[400px] p-10 flex flex-col gap-8 bg-white dark:bg-[#1E1E21] overflow-y-auto">
                        <div className="flex items-center justify-between">
                           <h2 className="text-2xl font-bold text-slate-900 dark:text-white italic uppercase">Social Content Edit</h2>
                           <button onClick={() => setEditModal({ open: false, post: null })} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
                              <Trash2 className="w-5 h-5 text-slate-400 dark:text-white/20" />
                           </button>
                        </div>

                        <div className="space-y-4">
                           <label className="text-sm font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Platform</label>
                           <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-[#111114] rounded-2xl border border-slate-100 dark:border-white/5">
                              {editModal.post.platform === "Instagram" && <Instagram className="w-6 h-6 text-pink-600" />}
                              {editModal.post.platform === "LinkedIn" && <LinkedinIcon className="w-6 h-6 text-blue-600" />}
                              {editModal.post.platform === "TikTok" && <Smartphone className="w-6 h-6 text-black dark:text-white" />}
                              <span className="font-bold text-slate-900 dark:text-white">{editModal.post.platform}</span>
                           </div>
                        </div>

                        <div className="space-y-4 flex-1">
                           <label className="text-sm font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Post Content</label>
                           <textarea
                              className="w-full h-48 bg-slate-50 dark:bg-[#111114] border border-slate-100 dark:border-white/5 rounded-2xl p-6 text-slate-700 dark:text-white/80 text-lg leading-relaxed focus:bg-white dark:focus:bg-[#111114] focus:border-[#0099ff] transition-all outline-none resize-none"
                              value={editModal.post.content}
                              onChange={(e) => {
                                 const newPost = { ...editModal.post!, content: e.target.value }
                                 setEditModal({ ...editModal, post: newPost })
                              }}
                           />
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-4">
                           <Button variant="outline" className="flex-1 rounded-2xl h-14 bg-white dark:bg-[#111114] text-black dark:text-white border dark:border-white/10" onClick={() => setEditModal({ open: false, post: null })}>Cancel</Button>
                           <Button className="flex-1 bg-[#0099ff] hover:bg-[#007cd0] rounded-2xl h-14 text-white font-bold" onClick={() => {
                              const newPosts = (data.posts || []).map(p => p.id === editModal.post!.id ? editModal.post! : p)
                              setData({ ...data, posts: newPosts })
                              saveData({ ...data, posts: newPosts })
                              setEditModal({ open: false, post: null })
                              toast.success("Post updated!")
                           }}>Save Sushi</Button>
                        </div>
                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </div>
   )
}
