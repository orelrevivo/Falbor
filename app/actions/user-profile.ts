"use server"

import { auth } from "@clerk/nextjs/server"
import { neon } from "@neondatabase/serverless"
import { userProfiles, templates } from "@/config/schema"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-http"
import { createClerkClient } from "@clerk/nextjs/server"

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function updateUserProfile(data: any) {
    const { userId } = await auth()

    if (!userId) {
        return { success: false, error: "Unauthorized" }
    }

    const sql = neon(process.env.NEON_NEON_DATABASE_URL!)
    const db = drizzle(sql)

    try {
        // 1. Update Clerk if name/username changed
        const clerkUser = await clerkClient.users.getUser(userId);

        // Split fullName into firstName and lastName for Clerk if needed
        let firstName = clerkUser.firstName;
        let lastName = clerkUser.lastName;
        if (data.fullName !== clerkUser.fullName) {
            const names = data.fullName.split(' ');
            firstName = names[0];
            lastName = names.slice(1).join(' ');
        }

        await clerkClient.users.updateUser(userId, {
            username: data.username || undefined,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
        });

        // 2. Update Local DB
        const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId))

        if (existing.length > 0) {
            await db.update(userProfiles).set({
                username: data.username,
                fullName: data.fullName,
                bio: data.bio,
                location: data.location,
                websiteUrl: data.websiteUrl,
                githubUrl: data.githubUrl,
                twitterUrl: data.twitterUrl,
                updatedAt: new Date(),
            }).where(eq(userProfiles.userId, userId))
        } else {
            await db.insert(userProfiles).values({
                userId,
                email: clerkUser.emailAddresses[0]?.emailAddress || "",
                username: data.username,
                fullName: data.fullName,
                bio: data.bio,
                location: data.location,
                websiteUrl: data.websiteUrl,
                githubUrl: data.githubUrl,
                twitterUrl: data.twitterUrl,
            })
        }

        return { success: true }
    } catch (error: any) {
        console.error("Failed to update profile:", error)
        // Handle Clerk-specific errors (e.g., username taken)
        if (error.errors?.[0]?.code === "form_identifier_exists") {
            return { success: false, error: "Username is already taken" }
        }
        return { success: false, error: error.message || "Failed to update profile" }
    }
}

export async function getUserProfileById(userId: string) {
    if (!userId || userId === "[id]") {
        return null
    }

    const sqlConn = neon(process.env.NEON_NEON_DATABASE_URL!)
    const db = drizzle(sqlConn)

    try {
        // 1. Get profile from DB
        const profiles = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId))
        const profile = profiles[0] || null

        const { userId: currentUserId } = await auth()

        // 2. Get user info from Clerk (public info)
        const clerkUser = await clerkClient.users.getUser(userId)

        // 3. Permission check
        if (profile?.isPrivate && currentUserId !== userId) {
            return null
        }

        return {
            profile,
            user: {
                id: clerkUser.id,
                username: clerkUser.username,
                fullName: clerkUser.fullName,
                imageUrl: clerkUser.imageUrl,
                createdAt: clerkUser.createdAt
            }
        }
    } catch (error) {
        console.error("Failed to fetch user profile by ID:", error)
        return null
    }
}

export async function getUserTemplates(userId: string) {
    const sqlConn = neon(process.env.NEON_NEON_DATABASE_URL!)
    const db = drizzle(sqlConn)

    try {
        const userTemplates = await db.select()
            .from(templates)
            .where(eq(templates.creatorId, userId))

        return userTemplates
    } catch (error) {
        console.error("Failed to fetch user templates:", error)
        return []
    }
}

export async function toggleProfilePrivacy(isPrivate: boolean) {
    const { userId } = await auth()

    if (!userId) {
        return { success: false, error: "Unauthorized" }
    }

    const sqlConn = neon(process.env.NEON_NEON_DATABASE_URL!)
    const db = drizzle(sqlConn)

    try {
        const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId))

        if (existing.length > 0) {
            await db.update(userProfiles).set({
                isPrivate,
                updatedAt: new Date(),
            }).where(eq(userProfiles.userId, userId))
        } else {
            // Should theoretically not happen if they have a profile page accessible, 
            // but let's be safe.
            const clerkUser = await clerkClient.users.getUser(userId);
            await db.insert(userProfiles).values({
                userId,
                email: clerkUser.emailAddresses[0]?.emailAddress || "",
                username: clerkUser.username || "",
                fullName: clerkUser.fullName || "",
                isPrivate,
            })
        }

        return { success: true }
    } catch (error) {
        console.error("Failed to toggle privacy:", error)
        return { success: false, error: "Failed to update privacy settings" }
    }
}

export async function updateNotificationSettings(data: { notificationSoundEnabled: boolean; notificationVolume: number }) {
    const { userId } = await auth()

    if (!userId) {
        return { success: false, error: "Unauthorized" }
    }

    const sqlConn = neon(process.env.NEON_NEON_DATABASE_URL!)
    const db = drizzle(sqlConn)

    try {
        const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId))

        if (existing.length > 0) {
            await db.update(userProfiles).set({
                notificationSoundEnabled: data.notificationSoundEnabled,
                notificationVolume: data.notificationVolume,
                updatedAt: new Date(),
            }).where(eq(userProfiles.userId, userId))
        } else {
            const clerkUser = await clerkClient.users.getUser(userId);
            await db.insert(userProfiles).values({
                userId,
                email: clerkUser.emailAddresses[0]?.emailAddress || "",
                username: clerkUser.username || "",
                fullName: clerkUser.fullName || "",
                notificationSoundEnabled: data.notificationSoundEnabled,
                notificationVolume: data.notificationVolume,
            })
        }

        return { success: true }
    } catch (error) {
        console.error("Failed to update notification settings:", error)
        return { success: false, error: "Failed to update notification settings" }
    }
}

