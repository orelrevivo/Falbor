import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/config/db"
import { userGithubConnections } from "@/config/schema"
import { eq, and } from "drizzle-orm"
import { Octokit } from "@octokit/core"

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [conn] = await db
      .select()
      .from(userGithubConnections)
      .where(and(eq(userGithubConnections.userId, userId), eq(userGithubConnections.isActive, true)))

    if (!conn || !conn.accessToken) {
      return NextResponse.json({ error: "GitHub account not connected" }, { status: 401 })
    }

    const octokit = new Octokit({ auth: conn.accessToken })
    let userReposResponse = await octokit.request("GET /user/repos", {
      sort: "updated",
      direction: "desc",
      per_page: 50 // fetch latest 50
    })

    const repos = userReposResponse.data.map((repo: any) => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      owner: repo.owner.login,
      url: repo.html_url,
      private: repo.private,
      updatedAt: repo.updated_at
    }))

    return NextResponse.json({ repos })
  } catch (error) {
    console.error("[GIT_REPOS_GET]", error)
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 })
  }
}