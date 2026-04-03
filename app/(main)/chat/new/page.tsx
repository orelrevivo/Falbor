import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/config/db"
import { projects } from "@/config/schema"
import { eq, desc } from "drizzle-orm"
import { ChatInterface } from "@/components/chat-interface"

export const dynamic = "force-dynamic"

export default async function NewChatPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { userId } = await auth()
  const params = await searchParams
  
  if (!userId) {
    redirect("/sign-in")
  }

  // Get the initial prompt if provided
  const initialPrompt = typeof params.prompt === 'string' ? params.prompt : undefined

  // Get user's most recent project or create a new one
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt))
    .limit(1)

  let project = userProjects[0]

  // If no project exists, create a default one
  if (!project) {
    const [newProject] = await db
      .insert(projects)
      .values({
        userId: userId,
        title: "New Project",
        description: "Auto-created project",
        isPublic: false,
      })
      .returning()
    
    project = newProject
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF9F5" }}>
      <ChatInterface 
        project={project} 
        initialMessages={[]} 
        initialUserMessage={initialPrompt}
      />
    </div>
  )
}
