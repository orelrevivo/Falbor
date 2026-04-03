import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projects as projectsTable } from "@/config/schema"
import { eq, desc } from "drizzle-orm"
import { SecurityView } from "@/components/security/security-view"
import { redirect, notFound } from "next/navigation"
import { getSecuritySession } from "@/app/actions/security"

export default async function SuperSecurityPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  const { id } = await params
  
  if (!userId) {
    redirect("/sign-in")
  }

  // Fetch projects for the sidebar
  const projects = await db
    .select({
      id: projectsTable.id,
      title: projectsTable.title,
      updated_at: projectsTable.updatedAt,
    })
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId))
    .orderBy(desc(projectsTable.updatedAt))
    .limit(50);

  // Fetch session data
  const session = await getSecuritySession(id);
  
  if (!session) {
    notFound();
  }

  return (
    <div className="w-full h-full overflow-hidden flex flex-col bg-[#FAF9F6]">
       <SecurityView session={session} projects={projects as any[]} />
    </div>
  )
}
