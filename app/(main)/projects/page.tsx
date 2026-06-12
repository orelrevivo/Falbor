import SidebarProjects from '@/components/project/SidebarProjects'
import { ProjectsGrid } from '@/components/project/ProjectsGrid'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import React from 'react'
import { UserProfileMenu } from '@/components/layout/user-profile-menu'

export default async function ProjectsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/')
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Your Chats</h1>
          </div>
        </div>

        <ProjectsGrid userId={userId} />
      </div>
    </div>
  )
}