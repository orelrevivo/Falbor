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
    let repoNameArg = ""
    let descriptionArg = "Created with Falbor AI"
    let isPrivateArg = false

    try {
        const body = await request.json()
        if (body.repoName) repoNameArg = body.repoName
        if (body.description) descriptionArg = body.description
        if (body.isPrivate !== undefined) isPrivateArg = body.isPrivate
    } catch (e) {
        // body might be empty or missing
    }

    try {
        // 1. Fetch project and files
        const [project] = await db
            .select()
            .from(projects)
            .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 400 })
        }

        if (project.isGithubClone) {
            return NextResponse.json({ error: "Project is already a GitHub repository" }, { status: 400 })
        }

        const projectFiles = await db
            .select()
            .from(files)
            .where(eq(files.projectId, projectId))

        if (projectFiles.length === 0) {
            return NextResponse.json({ error: "No files found to publish" }, { status: 400 })
        }

        // 2. Get user's GitHub token
        const [githubConn] = await db
            .select()
            .from(userGithubConnections)
            .where(and(eq(userGithubConnections.userId, userId), eq(userGithubConnections.isActive, true)))

        if (!githubConn || !githubConn.accessToken) {
            return NextResponse.json({ error: "GitHub account not connected. Please connect your GitHub account in the Settings first." }, { status: 400 })
        }

        const octokit = new Octokit({ auth: githubConn.accessToken })

        // Generate a valid GitHub repo name out of the title
        const repoName = repoNameArg || project.title.toLowerCase().replace(/[^a-z0-9-]/g, "-") || `falbor-project-${projectId.slice(0, 5)}`

        // 3. Create repository
        let createRes
        try {
            createRes = await octokit.request('POST /user/repos', {
                name: repoName,
                description: descriptionArg,
                private: isPrivateArg,
                auto_init: true // Create with empty commit so there's a master/main branch
            })
        } catch (err: any) {
            return NextResponse.json({ error: `Failed to create repository: ${err.message}` }, { status: 400 })
        }

        const { owner: repoOwner, name: newRepoName, html_url: githubUrl, default_branch: branch } = createRes.data

        // 4. Push all files to the new repo
        // Get latest commit on branch to get tree base
        try {
            const { data: refData } = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
                owner: repoOwner.login,
                repo: newRepoName,
                ref: `heads/${branch}`
            })
            const commitSha = refData.object.sha

            const { data: commitData } = await octokit.request('GET /repos/{owner}/{repo}/git/commits/{commit_sha}', {
                owner: repoOwner.login,
                repo: newRepoName,
                commit_sha: commitSha
            })
            const baseTreeSha = commitData.tree.sha

            // Create tree with files
            const treeItems = projectFiles.map(file => ({
                path: file.path,
                mode: '100644' as const,
                type: 'blob' as const,
                content: file.content
            }))

            const { data: newTree } = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
                owner: repoOwner.login,
                repo: newRepoName,
                base_tree: baseTreeSha,
                tree: treeItems
            })

            // Create commit
            const { data: newCommit } = await octokit.request('POST /repos/{owner}/{repo}/git/commits', {
                owner: repoOwner.login,
                repo: newRepoName,
                message: "Initial Falbor Commit: Project setup",
                tree: newTree.sha,
                parents: [commitSha]
            })

            // Update ref
            await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
                owner: repoOwner.login,
                repo: newRepoName,
                ref: `heads/${branch}`,
                sha: newCommit.sha,
                force: true
            })
        } catch (gitErr: any) {
            console.error("[GIT_PUBLISH] File push failed:", gitErr)
            return NextResponse.json({ error: `Repo created but failed to push files: ${gitErr.message}` }, { status: 500 })
        }

        // 5. Update DB to mark as Github Clone
        await db
            .update(projects)
            .set({
                title: `${repoOwner.login}/${newRepoName}`,
                isGithubClone: true,
                githubUrl,
                githubOwner: repoOwner.login,
                githubRepoName: newRepoName,
                githubBranch: branch,
                isGitAdopted: true, // Auto adopted because it's their repo!
            })
            .where(eq(projects.id, projectId))

        return NextResponse.json({ success: true, url: githubUrl })
    } catch (error: any) {
        console.error("[GIT_PUBLISH] Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
