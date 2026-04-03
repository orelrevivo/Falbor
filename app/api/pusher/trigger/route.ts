import { auth } from "@clerk/nextjs/server"
import { pusherServer } from "@/lib/pusher"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const { projectId, event, data } = await req.json()

    if (!projectId || !event || !data) {
        return new Response("Missing parameters", { status: 400 })
    }

    // Transform client event to server event name if necessary, or just use as is
    const eventName = event.startsWith("client-") ? event.replace("client-", "server-") : event

    await pusherServer.trigger(`presence-project-${projectId}`, eventName, {
        ...data,
        senderId: userId
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[Pusher/Trigger] Error:", err)
    return new Response("Error triggering event", { status: 500 })
  }
}
