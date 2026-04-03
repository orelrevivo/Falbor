import { db } from "@/config/db"
import { projectFeedback } from "@/config/schema"
import { NextResponse } from "next/server"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(req: Request) {
  try {
    const { projectId, email, message, userId } = await req.json()
    
    if (!projectId || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders })
    }

    await db.insert(projectFeedback).values({
      projectId,
      email,
      message,
      userId: userId || null,
    })

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (err: any) {
    console.error("[Feedback API] Submission error:", err)
    return NextResponse.json({ error: "Failed to submit feedback", details: err.message }, { status: 500, headers: corsHeaders })
  }
}
