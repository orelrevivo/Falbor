import { auth, currentUser } from "@clerk/nextjs/server"
import { pusherServer } from "@/lib/pusher"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId || !user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Pusher auth request sends data as form-data or JSON (usually form-data for pusher-js)
  // Let's handle both
  let socketId: string
  let channelName: string

  try {
    const body = await req.formData()
    socketId = body.get("socket_id") as string
    channelName = body.get("channel_name") as string
  } catch {
    const body = await req.json()
    socketId = body.socket_id
    channelName = body.channel_name
  }

  const presenceData = {
    user_id: userId,
    user_info: {
      name: user.firstName || user.username || "Anonymous",
      color: "#" + Math.floor(Math.random()*16777215).toString(16), // Fallback if no color provided
    },
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData)
  return NextResponse.json(authResponse)
}
