import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/config/db"
import { projects, files, userGithubConnections } from "@/config/schema"
import { eq, and } from "drizzle-orm"
import { Octokit } from "@octokit/core"

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await params

    try {
        const { message = "Update via Falbor AI" } = await request.json()

        // 1. Fetch project and files
        const [project] = await db
            .select()
            .from(projects)
            .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

        if (!project || !project.isGithubClone || !project.githubOwner || !project.githubRepoName) {
            return NextResponse.json({ error: "Project is not a GitHub clone or missing metadata" }, { status: 400 })
        }

        if (!project.isGitAdopted) {
            return NextResponse.json({ error: "Project is not adopted. Please adopt the project first." }, { status: 400 })
        }

        const projectFiles = await db
            .select()
            .from(files)
            .where(eq(files.projectId, projectId))

        if (projectFiles.length === 0) {
            return NextResponse.json({ error: "No files found to push" }, { status: 400 })
        }

        // 2. Get user's GitHub token
        const [githubConn] = await db
            .select()
            .from(userGithubConnections)
            .where(and(eq(userGithubConnections.userId, userId), eq(userGithubConnections.isActive, true)))

        if (!githubConn || !githubConn.accessToken) {
            return NextResponse.json({ error: "GitHub account not connected or token missing" }, { status: 400 })
        }

        const octokit = new Octokit({ auth: githubConn.accessToken })
        const owner = project.githubOwner
        const repo = project.githubRepoName
        const branch = project.githubBranch || "main"

        console.log(`[GIT_PUSH] Pushing to ${owner}/${repo} on branch ${branch}`)

        // 3. Get the latest commit SHA of the branch
        let baseTreeSha: string
        let commitSha: string
        try {
            const { data: refData } = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
                owner,
                repo,
                ref: `heads/${branch}`
            })
            commitSha = refData.object.sha

            const { data: commitData } = await octokit.request('GET /repos/{owner}/{repo}/git/commits/{commit_sha}', {
                owner,
                repo,
                commit_sha: commitSha
            })
            baseTreeSha = commitData.tree.sha
        } catch (err: any) {
            console.error("[GIT_PUSH] Error fetching branch ref:", err)
            return NextResponse.json({ error: `Failed to fetch branch info. Ensure the branch '${branch}' exists.` }, { status: 404 })
        }

        // 4. Create blobs and tree
        // Note: To be efficient, we only create blobs for text files. 
        // For simplicity, we create a tree with all files currently in our DB.
        const treeItems = projectFiles.map(file => ({
            path: file.path,
            mode: '100644' as const,
            type: 'blob' as const,
            content: file.content
        }))

        const { data: newTree } = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
            owner,
            repo,
            base_tree: baseTreeSha,
            tree: treeItems
        })

        // 5. Create the commit
        const { data: newCommit } = await octokit.request('POST /repos/{owner}/{repo}/git/commits', {
            owner,
            repo,
            message,
            tree: newTree.sha,
            parents: [commitSha]
        })

        // Wait, the parents need the commit SHA, not the tree SHA. RefData.object.sha is the commit SHA.
        // Let me re-check. Yes, refData.object.sha is the current head commit.

        // 6. Update the reference
        await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
            owner,
            repo,
            ref: `heads/${branch}`,
            sha: newCommit.sha,
            force: false
        })

        return NextResponse.json({ success: true, commitSha: newCommit.sha })
    } catch (error: any) {
        console.error("[GIT_PUSH] Error:", error)
        const message = error.response?.data?.message || error.message || "Internal Server Error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
