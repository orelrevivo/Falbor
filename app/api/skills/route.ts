import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getUserSkillsForAIContext, initializeSystemSkills } from "@/app/actions/skills"

// GET /api/skills - Get user's enabled skills for AI context
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const skills = await getUserSkillsForAIContext(userId)
    return NextResponse.json({ skills })
  } catch (error) {
    console.error("[API/Skills] Failed to fetch skills:", error)
    return NextResponse.json(
      { error: "Failed to fetch skills" },
      { status: 500 }
    )
  }
}

// POST /api/skills/init - Initialize system skills (admin only)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize default system skills
    const result = await initializeSystemSkills()
    
    if (result.success) {
      return NextResponse.json({ message: result.message })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[API/Skills] Failed to initialize skills:", error)
    return NextResponse.json(
      { error: "Failed to initialize skills" },
      { status: 500 }
    )
  }
}
