import { neon } from "@neondatabase/serverless"
import { currentUser } from "@clerk/nextjs/server"
import { ChatsTableClient } from "./ChatsTableClient"

interface Project {
    id: string
    title: string
    updated_at: string
    user_id: string
    is_owner: boolean
    owner_name?: string
    collaborator_count?: number
    preview_url?: string | null
}

interface User {
    id: string
    firstName?: string | null
    imageUrl: string
}

export async function ProjectsGrid({ userId }: { userId: string }) {
    const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

    // Get owned projects
    const ownedProjects = (await sql`
    SELECT
      p.id,
      p.title,
      p.updated_at,
      p.user_id,
      true as is_owner,
      (SELECT COUNT(*) FROM project_collaborators pc 
       WHERE pc.project_id = p.id AND pc.status = 'accepted') as collaborator_count,
      (SELECT a.preview_url
       FROM artifacts a
       WHERE a.project_id = p.id
       ORDER BY a.created_at DESC
       LIMIT 1) as preview_url
    FROM projects p
    WHERE p.user_id = ${userId}
    ORDER BY p.updated_at DESC
  `) as Project[]

    // Get collaborated projects
    const collaboratedProjects = (await sql`
    SELECT
      p.id,
      p.title,
      p.updated_at,
      p.user_id,
      false as is_owner,
      (SELECT a.preview_url
       FROM artifacts a
       WHERE a.project_id = p.id
       ORDER BY a.created_at DESC
       LIMIT 1) as preview_url
    FROM projects p
    JOIN project_collaborators pc ON p.id = pc.project_id
    WHERE pc.user_id = ${userId} AND pc.status = 'accepted'
    ORDER BY p.updated_at DESC
  `) as Project[]

    const allProjects = [...ownedProjects, ...collaboratedProjects].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )

    if (allProjects.length === 0) {
        return (
            <div className="text-center text-zinc-500 py-20 border-2 border-dashed rounded-xl border-zinc-200">
                <p className="text-lg font-medium">No chats yet</p>
                <p className="text-sm">Start by creating your first automated project.</p>
            </div>
        )
    }

    const current = await currentUser()
    const user: User = {
        id: current?.id || userId,
        firstName: current?.firstName,
        imageUrl: current?.imageUrl || "/default-avatar.png",
    }

    return (
        <ChatsTableClient initialProjects={allProjects} user={user} />
    )
}
