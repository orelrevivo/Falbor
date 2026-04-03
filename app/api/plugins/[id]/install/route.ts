import { db } from "@/config/db";
import { plugins } from "@/config/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Increment installs count
    await db
      .update(plugins)
      .set({
        installs: sql`${plugins.installs} + 1`,
      })
      .where(eq(plugins.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PLUGIN_INSTALL_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
