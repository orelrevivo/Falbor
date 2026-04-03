import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/config/db"
import { projects, messages, files, userGithubConnections } from "@/config/schema"
import { eq } from "drizzle-orm"

interface GitHubFile {
  path: string
  type: "blob" | "tree"
  sha: string
  size: number
  url: string
  download_url?: string
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { owner, repo, githubUrl } = await request.json()

    console.log("[v0] GitHub clone request:", { owner, repo, githubUrl })

    if (!owner || !repo) {
      return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 })
    }

    // Try finding user's github connection for auth
    let accessToken
    try {
      const [conn] = await db
        .select()
        .from(userGithubConnections)
        .where(eq(userGithubConnections.userId, userId))
      if (conn && conn.accessToken && conn.isActive) {
        accessToken = conn.accessToken
      }
    } catch (e) {
      console.error("No github connection found", e)
    }

    const authHeader = accessToken
      ? `Bearer ${accessToken}`
      : process.env.GITHUB_TOKEN ? `Bearer ${process.env.GITHUB_TOKEN}` : ""

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    }
    if (authHeader) headers["Authorization"] = authHeader

    // Create project
    const [project] = await db
      .insert(projects)
      .values({
        userId,
        title: `${owner}/${repo}`,
        isGithubClone: true,
        githubUrl: githubUrl || `https://github.com/${owner}/${repo}`,
        githubOwner: owner,
        githubRepoName: repo,
        githubBranch: "main", // Default
        isGitAdopted: !!accessToken // Auto-adopt if they used their own token (meaning they own it or connected intentionally)
      })
      .returning()

    console.log("[v0] Created project:", project.id)

    // 1. Create a user message to record the import request
    await db.insert(messages).values({
      projectId: project.id,
      role: "user",
      content: `Do an import for me to the files from ${githubUrl || `https://github.com/${owner}/${repo}`}`,
      hasArtifact: false,
    })

    // 2. Fetch repository tree from GitHub API
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`
    const treeResponse = await fetch(treeUrl, { headers })

    console.log("[v0] GitHub API response status:", treeResponse.status)

    let treeData: any
    if (!treeResponse.ok) {
      const errorText = await treeResponse.text()
      console.error(`[v0] GitHub error (main): ${treeResponse.status} - ${errorText}`)

      // Try 'master' branch if 'main' fails
      const masterTreeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`
      const masterResponse = await fetch(masterTreeUrl, { headers })

      if (!masterResponse.ok) {
        const masterErrorText = await masterResponse.text()
        console.error(`[v0] GitHub error (master): ${masterResponse.status} - ${masterErrorText}`)
        throw new Error("Failed to fetch repository tree. Ensure the repo exists and you have access permissions.")
      }

      const masterData = await masterResponse.json()
      treeData = masterData
      console.log("[v0] Fetched tree from master, files count:", masterData.tree?.length || 0)

      // Update branch in project
      await db.update(projects).set({ githubBranch: "master" }).where(eq(projects.id, project.id))

      await processRepositoryFiles(masterData.tree, owner, repo, project.id, "master", authHeader)
    } else {
      treeData = await treeResponse.json()
      console.log("[v0] Fetched tree from main, files count:", treeData.tree?.length || 0)
      await processRepositoryFiles(treeData.tree, owner, repo, project.id, "main", authHeader)
    }

    // 3. Count saved files and create assistant message
    const fileCount = await db
      .select()
      .from(files)
      .where(eq(files.projectId, project.id))
      .then((results) => results.length)

    console.log("[v0] Total files saved:", fileCount)

    await db.insert(messages).values({
      projectId: project.id,
      role: "assistant",
      content: `Successfully cloned **${owner}/${repo}** repository!\n\nFetched **${fileCount} files** from GitHub. You can now explore the codebase, edit files, and use the "Push to GitHub" button if you've adopted the project.\n\nWhat would you like to build?`,
      hasArtifact: false,
    })

    return NextResponse.json({ projectId: project.id })
  } catch (error) {
    console.error("[GitHub Clone] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to clone repository" },
      { status: 500 },
    )
  }
}

async function processRepositoryFiles(
  tree: GitHubFile[],
  owner: string,
  repo: string,
  projectId: string,
  branch = "main",
  authHeader = ""
) {
  const fileItems = tree.filter(
    (item) => item.type === "blob" && item.size < 1000000,
  )

  console.log("[v0] Processing files, filtered count:", fileItems.length)

  const limitedFiles = fileItems.slice(0, 2000)
  const batchSize = 10

  const headers: Record<string, string> = {}
  if (authHeader) headers["Authorization"] = authHeader

  for (let i = 0; i < limitedFiles.length; i += batchSize) {
    const batch = limitedFiles.slice(i, i + batchSize)
    console.log(`[v0] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(limitedFiles.length / batchSize)}`)
    await Promise.all(
      batch.map(async (file) => {
        try {
          const contentUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`
          const contentResponse = await fetch(contentUrl, { headers })

          if (!contentResponse.ok) {
            console.error(`[v0] Failed to fetch ${file.path}: ${contentResponse.status}`)
            return
          }

          const contentType = contentResponse.headers.get('content-type') || ''
          if (!contentType.startsWith('text/') && !contentType.includes('javascript') && !contentType.includes('json')) {
            console.log(`[v0] Skipped binary/non-text file: ${file.path}`)
            return
          }

          const content = await contentResponse.text()
          await saveFile(file.path, content, projectId)
          console.log("[v0] Saved file:", file.path)
        } catch (err) {
          console.error(`[v0] Failed to fetch ${file.path}:`, err)
        }
      }),
    )
  }
}

async function saveFile(path: string, content: string, projectId: string) {
  const language = getLanguageFromPath(path)

  await db.insert(files).values({
    projectId,
    path,
    content,
    language,
    additions: content.split("\n").length,
    deletions: 0,
  })
}

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    go: "go",
    rs: "rust",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sh: "bash",
    sql: "sql",
  }

  return languageMap[ext || ""] || "plaintext"
}