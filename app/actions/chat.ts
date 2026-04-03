"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { messages as messagesTable, projects } from "@/config/schema"
import { eq, and, gt } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/**
 * Truncates chat history after a specific message and updates that message's content.
 * Used when a user edits a message in the middle of a conversation.
 */
export async function truncateChatHistory(messageId: string, newContent: string) {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // 1. Get the target message to fetch its projectId and createdAt
    const [targetMessage] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))

    if (!targetMessage) {
      return { success: false, error: "Message not found" }
    }

    // 2. Verify project ownership to prevent unauthorized deletions
    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, targetMessage.projectId),
          eq(projects.userId, userId)
        )
      )

    if (!project) {
      return { success: false, error: "Project not found or access denied" }
    }

    // 3. Delete all messages in the same project created AFTER the target message
    await db
      .delete(messagesTable)
      .where(
        and(
          eq(messagesTable.projectId, targetMessage.projectId),
          gt(messagesTable.createdAt, targetMessage.createdAt)
        )
      )

    // 4. Update the actual message content
    await db
      .update(messagesTable)
      .set({
        content: newContent,
      })
      .where(eq(messagesTable.id, messageId))

    revalidatePath(`/chat/${targetMessage.projectId}`)
    return { success: true }
  } catch (error) {
    console.error("[truncateChatHistory] Error:", error)
    return { success: false, error: "Internal server error" }
  }
}
