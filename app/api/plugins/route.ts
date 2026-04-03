import { NextResponse } from "next/server"
import { db } from "@/config/db"
import { plugins } from "@/config/schema"

export async function GET() {
    try {
        const pluginsData = await db.select().from(plugins)
        return NextResponse.json(pluginsData)
    } catch (error) {
        console.error("Failed to fetch plugins", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
