"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Blocks, UserIcon } from "lucide-react"
import { UserProfileMenu } from "@/components/layout/user-profile-menu"

export default function CreatorWorkspaceLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    return (
        <div className="min-h-screen bg-[#111] flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-[#313131] bg-[#111] flex flex-col h-screen sticky top-0">
                {/* Logo Area */}
                <div className="h-13.5 flex items-center px-6 border-b border-[#313131] shrink-0">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="absolute top-[-27px] left-2 z-[101] pointer-events-none">
                            <img src="/logo.png" width={110} alt="" />
                        </div>
                    </Link>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-2 py-2.5 space-y-2">
                    <Link
                        href="/creator/workspace"
                        className={`flex items-center gap-3 px-2.5 py-1.5 rounded-sm ${pathname === '/creator/workspace' ? 'bg-[#313131] text-white' : 'text-white hover:text-white'}`}
                    >
                        <Blocks className="w-5 h-5" />
                        <span className="text-sm">Plugins</span>
                    </Link>
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
                {/* Top Navbar */}
                <header className="h-13.5 px-8 flex items-center justify-end border-b border-[#313131] bg-[#111] backdrop-blur-sm sticky top-0 z-10 w-full shrink-0">
                    <div className="flex items-center gap-4">
                        <UserProfileMenu />
                    </div>
                </header>

                <main className="flex-1 p-10">
                    {children}
                </main>
            </div>
        </div>
    )
}
