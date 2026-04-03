import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { eq, and, desc } from "drizzle-orm"
import { db } from "@/config/db"
import { projects, messages } from "@/config/schema"
import { PlanInterface } from "@/components/plan-interface"

interface PlanPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PlanPage({ params, searchParams }: PlanPageProps) {
  const { id } = await params
  const queryParams = await searchParams
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Fetch project
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), eq(projects.userId, userId)),
  })

  if (!project) {
    notFound()
  }

  // Fetch messages
  const projectMessages = await db.query.messages.findMany({
    where: eq(messages.projectId, id),
    orderBy: desc(messages.createdAt),
    limit: 50,
  })

  // Get initial message from query param if present
  const initialUserMessage = typeof queryParams.message === "string" ? queryParams.message : undefined

  return (
    <PlanInterface
      project={project}
      initialMessages={projectMessages.reverse()}
      initialUserMessage={initialUserMessage}
    />
  )
}
