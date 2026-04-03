import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getMcpConnections } from "@/app/actions/mcp"

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const connections = await getMcpConnections()
    return NextResponse.json({ connections })
  } catch (error) {
    console.error("Failed to fetch MCP connections:", error)
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    )
  }
}
