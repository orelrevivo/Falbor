"use server";

import { auth } from "@clerk/nextjs/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/config/db";
import * as schema from "@/config/schema";

export async function getSecuritySessions() {
  const { userId } = await auth();
  if (!userId) return [];

  return await db.query.securitySessions.findMany({
    where: eq(schema.securitySessions.userId, userId),
    orderBy: [desc(schema.securitySessions.updatedAt)],
    with: {
      projectId: true, // This won't work like this in drizzle query unless configured. 
      // Actually securitySessions.projectId is a column.
    }
  });
}

// Fixed getSecuritySessions with join for project title
export async function getSecuritySessionsWithProjects() {
  const { userId } = await auth();
  if (!userId) return [];

  const sessions = await db.select({
    id: schema.securitySessions.id,
    userId: schema.securitySessions.userId,
    projectId: schema.securitySessions.projectId,
    title: schema.securitySessions.title,
    messages: schema.securitySessions.messages,
    updatedAt: schema.securitySessions.updatedAt,
    projectTitle: schema.projects.title,
  })
  .from(schema.securitySessions)
  .leftJoin(schema.projects, eq(schema.securitySessions.projectId, schema.projects.id))
  .where(eq(schema.securitySessions.userId, userId))
  .orderBy(desc(schema.securitySessions.updatedAt));

  return sessions;
}

export async function getSecuritySession(id: string) {
  const { userId } = await auth();
  if (!userId) return null;

  const session = await db.query.securitySessions.findFirst({
    where: and(
      eq(schema.securitySessions.id, id),
      eq(schema.securitySessions.userId, userId)
    )
  });

  return session;
}

export async function createSecuritySession(title: string, projectId?: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [session] = await db.insert(schema.securitySessions).values({
    userId,
    title,
    projectId,
    messages: [],
    scanResults: null,
  }).returning();

  return session;
}

export async function updateSecuritySession(id: string, updates: Partial<schema.SecuritySession>) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [session] = await db.update(schema.securitySessions)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(and(
      eq(schema.securitySessions.id, id),
      eq(schema.securitySessions.userId, userId)
    ))
    .returning();

  return session;
}
