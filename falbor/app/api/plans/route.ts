import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { plans } from "@/config/schema"
import { eq, and } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, questions, summary } = body

    if (!projectId || !questions || !summary) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, questions, summary" },
        { status: 400 }
      )
    }

    const planId = uuidv4()

    // Insert the plan into the database
    await db.insert(plans).values({
      id: planId,
      projectId,
      userId,
      questions: JSON.stringify(questions),
      summary,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      planId,
      message: "Plan saved successfully"
    })
  } catch (error) {
    console.error("[Plans API] Error saving plan:", error)
    return NextResponse.json(
      { error: "Failed to save plan" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")
    const planId = searchParams.get("planId")

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing required parameter: projectId" },
        { status: 400 }
      )
    }

    // If planId is provided, get specific plan
    if (planId) {
      const plan = await db.query.plans.findFirst({
        where: and(
          eq(plans.id, planId),
          eq(plans.projectId, projectId),
          eq(plans.userId, userId)
        ),
      })

      if (!plan) {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 })
      }

      return NextResponse.json({
        ...plan,
        questions: JSON.parse(plan.questions as string),
      })
    }

    // Otherwise, get all plans for the project
    const projectPlans = await db.query.plans.findMany({
      where: and(
        eq(plans.projectId, projectId),
        eq(plans.userId, userId)
      ),
      orderBy: (plans, { desc }) => [desc(plans.createdAt)],
    })

    return NextResponse.json(
      projectPlans.map((plan) => ({
        ...plan,
        questions: JSON.parse(plan.questions as string),
      }))
    )
  } catch (error) {
    console.error("[Plans API] Error fetching plans:", error)
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    )
  }
}
