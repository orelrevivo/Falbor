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

        if (!conn) {
            return NextResponse.json({ connected: false })
        }

        return NextResponse.json({ connected: true, username: conn.githubUsername })
    } catch (error) {
        console.error("[GIT_CONNECTION_GET]", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const { token } = await request.json()
        if (!token) {
            return NextResponse.json({ error: "Token is required" }, { status: 400 })
        }

        // Verify token with GitHub
        const octokit = new Octokit({ auth: token })
        let userResponse
        try {
            userResponse = await octokit.request("GET /user")
        } catch (err) {
            return NextResponse.json({ error: "Invalid GitHub token. Ensure it has the correct permissions." }, { status: 401 })
        }

        const githubUsername = userResponse.data.login

        // Save or update existing connection
        // We use insert ... on conflict do update. Or we can just try finding and updating first.
        const [existing] = await db
            .select()
            .from(userGithubConnections)
            .where(eq(userGithubConnections.userId, userId))

        if (existing) {
            await db
                .update(userGithubConnections)
                .set({ accessToken: token, githubUsername, isActive: true, updatedAt: new Date() })
                .where(eq(userGithubConnections.userId, userId))
        } else {
            await db.insert(userGithubConnections).values({
                userId,
                accessToken: token,
                githubUsername,
                isActive: true,
            })
        }

        return NextResponse.json({ success: true, username: githubUsername })
    } catch (error) {
        console.error("[GIT_CONNECTION_POST]", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        await db
            .update(userGithubConnections)
            .set({ isActive: false, accessToken: "" })
            .where(eq(userGithubConnections.userId, userId))

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[GIT_CONNECTION_DELETE]", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
