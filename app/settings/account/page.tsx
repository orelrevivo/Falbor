import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { neon } from "@neondatabase/serverless"
import { UserProfile } from "@/config/schema"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Github, Globe, Twitter, Loader2 } from "lucide-react"
import ActivityGraph from "./activity-graph"
import { ProfileForm } from "./profile-form"

import { NotificationSettings } from "./notification-settings"
import { ColorSchemeSection } from "./color-scheme-section"

import { userProfiles } from "@/config/schema"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-http"

async function getUserProfile(userId: string) {
    const sql = neon(process.env.NEON_NEON_DATABASE_URL!)
    const db = drizzle(sql)
    try {
        const profiles = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId))
        return profiles[0] || null
    } catch (err) {
        console.error("Failed to fetch user profile:", err)
        return null
    }
}

export default async function AccountPage() {
    const user = await currentUser()
    if (!user) redirect("/")

    const profile = await getUserProfile(user.id)

    // Extract only needed data to avoid "Only plain objects..." error
    const userData = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        firstName: user.firstName,
        imageUrl: user.imageUrl,
        primaryEmailAddress: {
            emailAddress: user.primaryEmailAddress?.emailAddress
        }
    }

    return (
        <div className="flex flex-col gap-8 p-8 max-w-4xl mx-auto w-full">

            {/* Profile Section */}
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Account</h1>
                    <p className="text-muted-foreground">Manage your account settings and profile.</p>
                </div>

                <ProfileForm user={userData} initialProfile={profile} />
                <NotificationSettings initialProfile={profile} />
                <ColorSchemeSection />
            </div>

            {/* Activity Section */}
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-lg font-semibold">Activity</h2>
                    <p className="text-sm text-muted-foreground">Your contribution activity over the last year.</p>
                </div>

                <ActivityGraph userId={user.id} createdAt={user.createdAt} />
            </div>

        </div>
    )
}
