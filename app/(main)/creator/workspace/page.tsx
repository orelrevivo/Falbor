import { db } from "@/config/db"
import { plugins } from "@/config/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function CreatorWorkspacePage() {
    const { userId } = await auth()

    if (!userId) {
        return null // Will redirect normally
    }

    const userPlugins = await db.select().from(plugins).where(eq(plugins.userId, userId))

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl text-white/90">Your Plugins</h1>
                    <p className="text-sm text-white/70">Manage the plugins you have shared with the community.</p>
                </div>
                <Link href="/creator/workspace/new-plugin">
                    <Button className="bg-[#0099ff] hover:bg-[#0099ff]/80 text-white rounded-sm px-6">
                        <Plus className="w-4 h-4" />
                        New Plugin
                    </Button>
                </Link>
            </div>

            {userPlugins.length === 0 ? (
                <div className="w-full h-80 bg-white border border-gray-100 rounded-xl flex flex-col items-center justify-center text-center space-y-6 shadow-sm">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Package className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">No plugins submitted</h3>
                        <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto">Submit your first plugin to get reviews and start helping others build amazing things.</p>
                    </div>
                    <Link href="/creator/workspace/new-plugin">
                        <Button className="bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 font-bold px-8 py-6 rounded-lg shadow-sm w-full">
                            Build First Plugin
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {userPlugins.map((plugin) => (
                        <div key={plugin.id} className="bg-[#313131] rounded-md shadow-sm p-6 space-y-4 transition-colors group cursor-pointer relative overflow-hidden">
                            <div className="flex justify-between items-start">
                                <div className="">
                                    <h4 className="text-md text-white/90">{plugin.name}</h4>
                                    <p className="text-xs text-white/70">{plugin.tagline}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[#262626] flex items-center justify-between text-xs text-white/70">
                                <span>{plugin.installs} Installs</span>
                                <span>{plugin.isPaid ? 'Paid' : 'Free'}</span>
                            </div>

                            {/* Actions overlay */}
                            <div className="absolute inset-0 bg-[#262626] backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                                <Link href={`/plugins/${plugin.id}`} className="w-2/3">
                                    <Button variant="outline" className="w-full bg-[#0099ff] hover:bg-[#0099ff]/80 text-white rounded-sm text-xs h-8">View Details</Button>
                                </Link>
                                <Link href={`/creator/workspace/plugin/${plugin.id}`} className="w-2/3">
                                    <Button variant="outline" className="w-full border-white/20 hover:bg-white/10 text-white rounded-sm text-xs h-8">Edit Plugin</Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
