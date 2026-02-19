import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { neon } from "@neondatabase/serverless"
import { currentUser } from "@clerk/nextjs/server"
import { Users, Clock, ExternalLink, MoreVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
                <p className="text-lg font-medium">No projects yet</p>
                <p className="text-sm">Start by creating your first project through the dashboard.</p>
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
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allProjects.map((project) => (
                <ProjectCard key={project.id} project={project} user={user} />
            ))}
        </div>
    )
}

function ProjectCard({ project, user }: { project: Project; user: User }) {
    const formattedDate = new Date(project.updated_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })

    return (
        <Link href={`/chat/${project.id}`} className="group block">
            <Card className="overflow-hidden border border-zinc-200 hover:border-black shadow-none bg-white relative">
                <div className="aspect-[16/9] w-full bg-zinc-100 relative group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                    {project.preview_url ? (
                        <img src={project.preview_url} alt={project.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-50">
                            <span className="text-zinc-800">No Preview Available</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

                    <div className="absolute top-3 left-3">
                        <Badge variant={project.is_owner ? "default" : "secondary"} className="bg-white/90 backdrop-blur-md text-zinc-900 border-none shadow-sm text-[10px] font-bold uppercase tracking-wider">
                            {project.is_owner ? "Owner" : "Collaborator"}
                        </Badge>
                    </div>
                </div>

                <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                            <h3 className="font-bold text-zinc-900 leading-none group-hover:text-black transition-colors">
                                {project.title}
                            </h3>
                            <div className="flex items-center gap-1.5 text-zinc-500">
                                <Clock className="w-3 h-3" />
                                <span className="text-[11px] font-medium">{formattedDate}</span>
                            </div>
                        </div>
                        <div className="h-8 w-8 bg-zinc-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="w-4 h-4 text-zinc-600" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 border border-white">
                                <AvatarImage src={user.imageUrl} />
                                <AvatarFallback className="text-[10px]">{user.firstName?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-zinc-600 font-medium">{user.firstName || "User"}</span>
                        </div>

                        {project.collaborator_count && project.collaborator_count > 0 && (
                            <div className="flex items-center gap-1 text-zinc-400">
                                <Users className="w-3 h-3" />
                                <span className="text-[10px] font-bold">+{project.collaborator_count}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
