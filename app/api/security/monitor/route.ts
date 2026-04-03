import { db } from "@/config/db";
import { securityMonitors, projects } from "@/config/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const allMonitors = await db.select().from(securityMonitors);
    
    for (const monitor of allMonitors) {
      if (!monitor.publishedUrl) continue;
      
      try {
        const startTime = Date.now();
        const res = await fetch(monitor.publishedUrl, { method: 'HEAD', timeout: 5000 } as any);
        const duration = Date.now() - startTime;
        
        let status = "up";
        if (res.status >= 400) status = "down";
        if (duration > 3000) status = "slow";
        
        await db.update(securityMonitors)
          .set({
            uptimeStatus: status,
            lastCheckedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(securityMonitors.id, monitor.id));
          
      } catch (err) {
        await db.update(securityMonitors)
          .set({
            uptimeStatus: "down",
            lastCheckedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(securityMonitors.id, monitor.id));
      }
    }
    
    return NextResponse.json({ success: true, processed: allMonitors.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Manual trigger for one monitor or create new monitor
  const { projectId, url, userId } = await req.json();
  
  const [monitor] = await db.insert(securityMonitors).values({
    userId,
    projectId,
    publishedUrl: url,
    uptimeStatus: "checking",
  }).returning();
  
  return NextResponse.json(monitor);
}
