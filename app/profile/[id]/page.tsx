import { getUserProfileById, getUserTemplates } from "@/app/actions/user-profile"
import SidebarProjects from "@/components/project/SidebarProjects"
import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Github, Globe, Twitter, Mail, MapPin, Link as LinkIcon, Copy, ExternalLink } from "lucide-react"
import ActivityGraph from "@/app/settings/account/activity-graph"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfilePrivacyToggle } from "@/components/project/ProfilePrivacyToggle"
import { ShieldAlert, Lock } from "lucide-react"

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { userId: currentUserId } = await auth()
    const data = await getUserProfileById(id)

    if (!data) {
        return (
            <div className="relative min-h-screen bg-[#FAF9F5] flex items-center justify-center text-black">
                <div className="absolute inset-y-0 left-0 z-20">
                    <SidebarProjects userId={currentUserId || ""} />
                </div>
                <div
                    className="absolute z-10 backdrop-blur-md border rounded-md shadow-sm p-8 bg-white flex flex-col items-center justify-center text-center space-y-4"
                    style={{
                        top: "60px",
                        left: "300px",
                        right: "10px",
                        bottom: "10px",
                    }}
                >
                    <div className="h-16 w-16 bg-zinc-100 rounded-full flex items-center justify-center mb-2">
                        <Lock className="h-8 w-8 text-zinc-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900">This profile is private</h1>
                    <p className="text-zinc-500 max-w-xs">
                        The user has chosen to keep their profile information private.
                    </p>
                    <Link href="/">
                        <Button variant="outline" className="bg-transparent">Return Home</Button>
                    </Link>
                </div>
            </div>
        )
    }

    const { profile, user } = data
    const templates = await getUserTemplates(id)

    return (
        <div className="relative min-h-screen bg-[#FAF9F5] overflow-hidden">
            {/* Sidebar Area */}
            <div className="absolute inset-y-0 left-0 z-20">
                <SidebarProjects userId={currentUserId || ""} />
            </div>

            {/* Profile Content Area - Matching Landing Page Style */}
            <div
                className="absolute z-10 backdrop-blur-md border rounded-md shadow-sm p-6 sm:p-8 overflow-auto bg-white"
                style={{
                    top: "60px",
                    left: "300px",
                    right: "10px",
                    bottom: "10px",
                }}
            >
                <div className="max-w-4xl mx-auto w-full space-y-12">

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Avatar className="h-24 w-24 border-2 border-white">
                                <AvatarImage src={user.imageUrl} />
                                <AvatarFallback className="text-2xl">{user.fullName?.[0] || user.username?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{user.fullName || user.username}</h1>
                                <p className="text-zinc-500 font-medium">@{user.username || user.id.slice(0, 8)}</p>
                                {profile?.location && (
                                    <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {profile.location}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {currentUserId === id && (
                                <ProfilePrivacyToggle
                                    initialIsPrivate={profile?.isPrivate || false}
                                    profileUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/profile/${id}`}
                                />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Left Column: Info & Links */}
                        <div className="lg:col-span-1 space-y-1">
                            <div className="space-y-4">
                                <p className="text-zinc-600 leading-relaxed text-sm">
                                    {profile?.bio || "No biography provided."}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col gap-3">
                                    {profile?.websiteUrl && (
                                        <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-zinc-600 transition-colors">
                                            <Globe className="h-4 w-4" />
                                            <span className="text-sm truncate">{profile.websiteUrl.replace(/^https?:\/\//, "")}</span>
                                        </a>
                                    )}
                                    {profile?.githubUrl && (
                                        <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-zinc-600 transition-colors">
                                            <Github className="h-4 w-4" />
                                            <span className="text-sm truncate">{profile.githubUrl.split("/").pop()}</span>
                                        </a>
                                    )}
                                    {profile?.twitterUrl && (
                                        <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-zinc-600 transition-colors">
                                            <Twitter className="h-4 w-4" />
                                            <span className="text-sm truncate">{profile.twitterUrl.split("/").pop()}</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Activity & Templates */}
                        <div className="lg:col-span-2 space-y-12">
                            <div className="space-y-4">
                                <ActivityGraph userId={id} createdAt={user.createdAt} />
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm text-zinc-800">Showcase</h2>
                                    <span className="text-xs bg-zinc-100 px-2 py-1 rounded-full text-zinc-500 font-medium">
                                        {templates.length}
                                    </span>
                                </div>

                                {templates.length === 0 ? (
                                    <div className="p-8 border rounded-lg text-center space-y-2 bg-white">
                                        <p className="text-sm text-zinc-500">No community submissions to display.</p>
                                        <p className="text-xs text-zinc-400 whitespace-nowrap overflow-hidden text-ellipsis">When {user.fullName || user.username} publishes a template, it will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {templates.map((template) => (
                                            <Card key={template.id} className="border-none shadow-none">
                                                <CardHeader className="p-4 space-y-1">
                                                    <div className="aspect-video w-full rounded-md bg-zinc-100 mb-3 overflow-hidden border">
                                                        <img src={template.mainImage} alt={template.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                    </div>
                                                    <CardTitle className="text-base font-semibold truncate group-hover:text-indigo-600">{template.title}</CardTitle>
                                                    <CardDescription className="text-xs line-clamp-2 leading-relaxed h-8">
                                                        {template.description}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardFooter className="p-4 pt-0 flex justify-between items-center">
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {(template.tags as string[] || []).slice(0, 2).map((tag) => (
                                                            <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    <Link href={`/templates/${template.id}`}>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
