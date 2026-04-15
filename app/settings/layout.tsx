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
        <div className="relative min-h-screen bg-background overflow-hidden">


            {/* Settings Content Area - Matching Landing Page Style */}
            <div
                className="absolute z-10 p-6 sm:p-8 overflow-auto bg-card"
                style={{
                    top: "0px",
                    left: "0px",
                    right: "10px",
                    bottom: "10px",
                }}
            >
                {children}
            </div>
        </div>
    )
}
