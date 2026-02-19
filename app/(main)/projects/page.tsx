import SidebarProjects from '@/components/project/SidebarProjects'
import { ProjectsGrid } from '@/components/project/ProjectsGrid'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import React from 'react'

export default async function ProjectsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/')
  }

  return (
    <div className="relative min-h-screen bg-[#FAF9F5] overflow-hidden">
      {/* Sidebar Area */}
      <div className="absolute inset-y-0 left-0 z-20">
        <SidebarProjects userId={userId} />
      </div>

      {/* Content Area */}
      <div
        className="absolute z-10 backdrop-blur-md border rounded-md shadow-sm p-6 sm:p-8 overflow-auto bg-white text-black"
        style={{
          top: "60px",
          left: "300px",
          right: "10px",
          bottom: "10px",
        }}
      >
        <div className="max-w-6xl mx-auto w-full space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Your Projects</h1>
              <p className="text-zinc-500 mt-1">Manage and access all your generated applications.</p>
            </div>
          </div>

          <ProjectsGrid userId={userId} />
        </div>
      </div>
    </div>
  )
}