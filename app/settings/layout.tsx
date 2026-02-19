import SidebarProjects from "@/components/project/SidebarProjects"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function SettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { userId } = await auth()

    if (!userId) {
        redirect("/")
    }

    return (
        <div className="relative min-h-screen bg-[#FAF9F5] overflow-hidden">
            {/* Sidebar Area */}
            <div className="absolute inset-y-0 left-0 z-20">
                <SidebarProjects userId={userId} />
            </div>

            {/* Settings Content Area - Matching Landing Page Style */}
            <div
                className="absolute z-10 backdrop-blur-md border rounded-md shadow-sm p-6 sm:p-8 overflow-auto bg-white"
                style={{
                    top: "60px",
                    left: "300px",
                    right: "10px",
                    bottom: "10px",
                }}
            >
                {children}
            </div>
        </div>
    )
}
