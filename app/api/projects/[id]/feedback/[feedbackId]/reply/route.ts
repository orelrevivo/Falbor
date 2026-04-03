import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectFeedback, projects } from "@/config/schema"
import { eq, and } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; feedbackId: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: projectId, feedbackId } = await params
  const { reply, resendKey } = await req.json()

  if (!reply) {
    return NextResponse.json({ error: "Reply content is required" }, { status: 400 })
  }

  // Verify project ownership
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { projectSupabase } = await import("@/config/schema")

  const [supabaseConfig] = await db
    .select()
    .from(projectSupabase)
    .where(eq(projectSupabase.projectId, projectId))

  let item = null
  let isSupabaseFeedback = false

  // Try to update in Supabase instance first
  if (supabaseConfig && supabaseConfig.supabaseUrl && supabaseConfig.serviceRoleKey) {
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabaseAdmin = createClient(supabaseConfig.supabaseUrl, supabaseConfig.serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      
      const { data, error } = await supabaseAdmin.from("user_feedback").select("*").eq("id", feedbackId).single()
      if (data && !error) {
        item = { ...data, email: data.email, message: data.message }
        isSupabaseFeedback = true
        
        await supabaseAdmin.from("user_feedback").update({
          reply,
          status: "replied",
        }).eq("id", feedbackId)
      }
    } catch (err) {
      console.warn("Could not fetch feedback from custom Supabase instance", err)
    }
  }

  // Fallback to local DB
  if (!item) {
    const [localItem] = await db
      .select()
      .from(projectFeedback)
      .where(eq(projectFeedback.id, feedbackId))
    
    if (localItem) {
      item = localItem
      
      await db.update(projectFeedback)
        .set({
          reply,
          status: "replied",
          repliedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(projectFeedback.id, feedbackId))
    }
  }

  if (!item) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 })
  }


  // Try to send email via Resend API if key is provided
  let emailSent = false
  let emailError = null
  
  if (resendKey) {
    try {
      const htmlBody = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
        <h2 style="color: #333;">Feedback Response</h2>
        <p style="color: #666;">Hi there,</p>
        <p style="color: #666;">We received your feedback regarding <strong>${project.title}</strong>:</p>
        <blockquote style="background: #f9f9f9; border-left: 4px solid #ccc; padding: 10px 20px; border-radius: 4px; margin: 20px 0;">
          "${item.message}"
        </blockquote>
        <p style="color: #666;">Our team has responded:</p>
        <div style="background: #eef6ff; padding: 20px; border-radius: 8px; color: #1a56db; font-weight: 500;">
          ${reply.replace(/\n/g, '<br/>')}
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
          Best regards,<br/>
          The ${project.title} Team
        </p>
      </div>`

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Acme <onboarding@resend.dev>",
          to: [item.email],
          subject: `Reply to your feedback - ${project.title}`,
          html: htmlBody
        })
      })

      const data = await res.json()

      if (res.ok) {
        emailSent = true
      } else {
        emailError = data.message || "Failed to send via Resend"
        console.warn("Resend API failed:", emailError)
      }
    } catch (err: any) {
      emailError = err.message
      console.error("Failed to send email reply via Resend API:", err)
    }
  } else {
    emailError = "No Resend API Key provided."
  }

  return NextResponse.json({ success: true, emailSent, emailError })
}
