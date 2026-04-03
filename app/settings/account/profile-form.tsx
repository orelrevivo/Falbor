"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
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
import { toast } from "sonner"
import { updateUserProfile } from "@/app/actions/user-profile"
import { useRouter } from "next/navigation"

interface ProfileFormProps {
    user: any // Clerk User resource
    initialProfile: UserProfile | null
}

export function ProfileForm({ user, initialProfile }: ProfileFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        username: initialProfile?.username || user.username || "",
        fullName: initialProfile?.fullName || user.fullName || "",
        bio: initialProfile?.bio || "",
        websiteUrl: initialProfile?.websiteUrl || "",
        githubUrl: initialProfile?.githubUrl || "",
        twitterUrl: initialProfile?.twitterUrl || "",
        location: initialProfile?.location || "",
    })

    // Clerk email is read-only here
    const email = user.primaryEmailAddress?.emailAddress

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await updateUserProfile(formData)
            if (result.success) {
                toast.success("Profile updated successfully")
                router.refresh()
            } else {
                toast.error("Failed to update profile")
            }
        } catch (err) {
            console.error(err)
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="shadow-xs rounded-md">
            <CardHeader>
                <CardTitle>Profile Details</CardTitle>
                <CardDescription>
                    Update your public profile information.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">

                    {/* User Info Read-only/Avatar */}
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={user.imageUrl} />
                            <AvatarFallback>{user.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-medium text-lg">{user.fullName}</span>
                            <span className="text-sm text-muted-foreground">{email}</span>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="janedoe"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                            id="bio"
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            placeholder="Tell us a little bit about yourself"
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="San Francisco, CA"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="websiteUrl">Website</Label>
                            <div className="relative">
                                <Input
                                    id="websiteUrl"
                                    name="websiteUrl"
                                    value={formData.websiteUrl}
                                    onChange={handleChange}
                                    className="pl-9"
                                    placeholder="https://example.com"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="githubUrl">GitHub URL</Label>
                            <div className="relative">
                                <Input
                                    id="githubUrl"
                                    name="githubUrl"
                                    value={formData.githubUrl}
                                    onChange={handleChange}
                                    className="pl-9"
                                    placeholder="https://github.com/username"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="twitterUrl">X (Twitter) URL</Label>
                            <div className="relative">
                                <Input
                                    id="twitterUrl"
                                    name="twitterUrl"
                                    value={formData.twitterUrl}
                                    onChange={handleChange}
                                    className="pl-9"
                                    placeholder="https://x.com/username"
                                />
                            </div>
                        </div>
                    </div>
                    <hr className="" />
                </CardContent>
                <CardFooter className="px-6 py-4">
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
