"use client";

import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  FileText,
  Users,
  Plus,
  MessageSquare,
  Clock,
  Settings,
  ChevronRight,
  Search,
  GitBranch,
  Home,
  Folder,
  BookTemplate,
  Settings2,
  MoreHorizontal,
  Trash2,
  Copy,
  Star,
  ChevronDown,
  Circle,
  UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useClerk } from '@clerk/nextjs';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { GithubCloneDialog } from '../models/github-clone';
import { toast } from 'sonner';

interface ProjectItem {
  id: string;
  title: string;
  updated_at: string;
  is_owner: boolean;
  is_github_clone?: boolean;
  github_url?: string | null;
  is_favorite?: boolean;
  collaborator_count?: number;
}

interface SidebarProjectsProps {
  userId: string;
  initialProjects?: ProjectItem[];
  className?: string;
}

const menuVariants: Variants = {
  closed: { x: '-100%', opacity: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
  open: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
};

export default function SidebarProjects({
  userId,
  initialProjects,
  className,
}: SidebarProjectsProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects || []);
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const router = useRouter();

  // State
  const [recentsOpen, setRecentsOpen] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Update local state when props change
  useEffect(() => {
    if (initialProjects) {
      setProjects(initialProjects);
    }
  }, [initialProjects]);

  // Hover logic to open/close sidebar
  useEffect(() => {
    const threshold = 20; // px from left edge to trigger open

    const handleMouseMove = (e: MouseEvent) => {
      // Open if mouse is near left edge
      if (e.clientX < threshold) {
        setOpen(true);
      }
      // Close if mouse moves far right of the menu
      else if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        // Add a buffer zone so it doesn't close immediately when leaving the menu
        if (e.clientX > rect.right + 50) {
          setOpen(false);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Filtered projects
  const favoriteProjects = projects.filter(p => p.is_favorite);
  const recentProjects = projects.filter(p => !p.is_favorite);

  const filteredProjects = searchQuery
    ? projects.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleToggleFavorite = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic update
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, is_favorite: !p.is_favorite } : p
    ));

    try {
      const res = await fetch(`/api/projects/${projectId}/favorite`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to toggle favorite");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update favorite status");
      // Revert
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, is_favorite: !p.is_favorite } : p
      ));
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this project?")) return;

    // Optimistic update
    setProjects(prev => prev.filter(p => p.id !== projectId));

    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete project");
      toast.success("Project deleted");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete project");
      // Revert (need to fetch original data ideally, but usually refresh handles it)
      router.refresh();
    }
  };

  const handleCopyId = (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(projectId);
    toast.success("Project ID copied to clipboard");
  };

  const ProjectItemRow = ({ project }: { project: ProjectItem }) => (
    <div
      className="group flex items-center gap-2 px-1 rounded-sm BackgroundStyle relative"
    >
      <Link href={`/chat/${project.id}`} className="flex items-center gap-3 flex-1 min-w-0 py-0.5">
        <div className={cn(
          "flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
          project.is_owner
            ? "text-gray-900 dark:bg-blue-900/20 dark:text-blue-400"
            : "text-gray-900 dark:bg-amber-900/20 dark:text-amber-400"
        )}>
          {project.is_github_clone && project.github_url ? (
            <GitBranch className="h-4 w-4" />
          ) : project.is_owner ? (
            <Circle className="h-4 w-4" />
            //  <GitBranch className="h-4 w-4" /> // Reverted per request: "for regular projects... it actually shows a circle made of ui"
            // Wait, the request said: "icon to only appear for projects that actually have a url with Git... and actually for regular projects... It actually shows a circle made of ui."
            // I'll interpret "circle made of ui" as a simple circle icon or similar.
          ) : (
            <Users className="h-4 w-4" />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 truncate group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
            {project.title || 'Untitled Project'}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-zinc-400 group-hover:text-zinc-500">
            {/* Date removed per original code, kept logic same */}
            {!project.is_owner && (
              <>
                <span>•</span>
                <span>Shared</span>
              </>
            )}
          </div>
        </div>
      </Link>

      {/* Action Menu (Three dots) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="cursor-pointer h-6 w-6 p-0 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 top-1/2 -translate-y-1/2">
            <MoreHorizontal className="h-4 w-4 text-zinc-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={(e) => handleToggleFavorite(project.id, e)}>
            <Star className={cn("mr-2 h-4 w-4", project.is_favorite && "fill-yellow-400 text-yellow-400")} />
            {project.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => handleCopyId(project.id, e)}>
            <Copy className="mr-2 h-4 w-4" />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {project.is_owner && (
            <DropdownMenuItem onClick={(e) => handleDeleteProject(project.id, e)} className="text-red-600 focus:text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Project
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Check if we are in settings
  const pathname = usePathname();
  const isSettingsPage = pathname?.startsWith('/settings');

  return (
    <>
      <div
        ref={menuRef}
        className={cn(
          'fixed top-0 left-0 h-screen w-[300px] z-[999999] flex flex-col',
          className
        )}
      >
        {/* Header Section */}
        <div className="ml-3 mt-15 pb-2 space-y-1 pr-3">

          {!isSettingsPage ? (
            <>
              {/* Split New Chat Button */}
              <div className="flex items-center w-full mb-3 shadow-xs rounded-sm border bg-white z-50">
                <Link href="/" className="flex-1">
                  <Button variant="ghost" className="w-full justify-start rounded-r-none hover:bg-gray-50 h-9">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="font-medium text-sm">New Chat</span>
                  </Button>
                </Link>
                <div className="h-5 w-[1px] bg-gray-200"></div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="px-2 rounded-l-none hover:bg-gray-50 h-9">
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56" side="bottom">
                    <DropdownMenuItem onClick={() => router.push('/templates')}>
                      <BookTemplate className="mr-2 h-4 w-4" />
                      Start from a template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setGithubDialogOpen(true)}>
                      <GitBranch className="mr-2 h-4 w-4" />
                      Import from GitHub
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Search Button (Above Home) */}
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button className="py-1.5 w-full bg-transparent text-black BackgroundStyle rounded-sm flex items-center gap-2 justify-start">
                    <Search className="h-4 w-4" />
                    <span className="font-medium text-sm">Search</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0" align="start" side="bottom">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search projects..."
                      className="h-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-1">
                    {filteredProjects.length === 0 ? (
                      <div className="p-4 text-center text-xs text-zinc-500">
                        {searchQuery ? "No projects found" : "Type to search..."}
                      </div>
                    ) : (
                      filteredProjects.map(project => (
                        <Link
                          key={project.id}
                          href={`/chat/${project.id}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-2 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm text-sm"
                        >
                          <FileText className="h-3 w-3 text-zinc-500" />
                          <span className="truncate">{project.title}</span>
                        </Link>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <Link href="/">
                <Button className="py-1.5 w-full bg-transparent text-black BackgroundStyle rounded-sm flex items-center gap-2 justify-start">
                  <Home className="h-4 w-4" />
                  <span className="font-medium text-sm">Home</span>
                </Button>
              </Link>
              <Link href="/projects">
                <Button className="py-1.5 w-full bg-transparent text-black BackgroundStyle rounded-sm flex items-center gap-2 justify-start">
                  <Folder className="h-4 w-4" />
                  <span className="font-medium text-sm">Projects</span>
                </Button>
              </Link>
              <Link href="/templates">
                <Button className="py-1.5 w-full bg-transparent text-black BackgroundStyle rounded-sm flex items-center gap-2 justify-start">
                  <BookTemplate className="h-4 w-4" />
                  <span className="font-medium text-sm">Templates</span>
                </Button>
              </Link>
              {user && (
                <Link href={`/profile/${user.id}`}>
                  <Button className="py-1.5 w-full bg-transparent text-black BackgroundStyle rounded-sm flex items-center gap-2 justify-start">
                    <UserCircle className="h-4 w-4" />
                    <span className="font-medium text-sm">Profile</span>
                  </Button>
                </Link>
              )}
              <Link href="/settings">
                <Button className="py-1.5 w-full bg-transparent text-black BackgroundStyle rounded-sm flex items-center gap-2 justify-start">
                  <Settings2 className="h-4 w-4" />
                  <span className="font-medium text-sm">Settings</span>
                </Button>
              </Link>
            </>
          ) : (
            <>
              {/* Settings Mode Buttons */}
              <Link href="/">
                <Button className="py-1.5 w-full bg-transparent text-black BackgroundStyle rounded-sm flex items-center gap-2 justify-start mb-1">
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  <span className="font-medium text-sm">Back to Home</span>
                </Button>
              </Link>

              <Link href="/settings">
                <Button className={cn(
                  "py-1.5 w-full bg-transparent text-black BackgroundStyle rounded-sm flex items-center gap-2 justify-start mb-1",
                  pathname === '/settings' || pathname === '/settings/account' ? "BackgroundStyleButton" : ""
                )}>
                  <Users className="h-4 w-4" />
                  <span className="font-medium text-sm">Account</span>
                </Button>
              </Link>

              <Link href="/settings/mcp">
                <Button className={cn(
                  "py-1.5 w-full bg-transparent text-black BackgroundStyle rounded-sm flex items-center gap-2 justify-start",
                  pathname === '/settings/mcp' ? "BackgroundStyleButton" : ""
                )}>
                  <Settings2 className="h-4 w-4" />
                  <span className="font-medium text-sm">MCP</span>
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Projects List - Only show if NOT in settings */}
        {!isSettingsPage && (
          <div className="ml-3 flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 pr-3 mt-2">

            {/* Favorites Section */}
            <div className="space-y-1">
              <div
                className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-zinc-500 cursor-pointer hover:text-zinc-800"
                onClick={() => setFavoritesOpen(!favoritesOpen)}
              >
                <span>Favorites</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", !favoritesOpen && "-rotate-90")} />
              </div>

              {favoritesOpen && (
                favoriteProjects.length === 0 ? (
                  <div className="px-4 py-2 border-2 border-dashed border-zinc-200 rounded-md mx-2">
                    <p className="text-xs text-center text-zinc-400">
                      Favorite chats and projects that you use often.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {favoriteProjects.map(project => (
                      <ProjectItemRow key={project.id} project={project} />
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Recents Section */}
            <div className="space-y-1">
              <div
                className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-zinc-500 cursor-pointer hover:text-zinc-800"
                onClick={() => setRecentsOpen(!recentsOpen)}
              >
                <span>Recents</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", !recentsOpen && "-rotate-90")} />
              </div>

              {recentsOpen && (
                recentProjects.length === 0 && favoriteProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                    <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-3">
                      <FileText className="h-5 w-5 text-zinc-400" />
                    </div>
                    <p className="text-sm text-zinc-500 font-medium">No projects yet</p>
                    <p className="text-xs text-zinc-400 mt-1">Start a new chat to begin</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {recentProjects.map(project => (
                      <ProjectItemRow key={project.id} project={project} />
                    ))}
                  </div>
                )
              )}
            </div>

          </div>
        )}

        {/* Footer - Always show */}
        <div className="mb-3 ml-3 pr-3">
          <div
            onClick={() => openUserProfile()}
            className="flex items-center gap-3 px-2 py-2 rounded-lg BackgroundStyle cursor-pointer group"
          >
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName || "User"}
                className="h-8 w-8 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {user?.firstName?.slice(0, 1) || userId.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {user?.fullName || "User Account"}
              </p>
              <p className="text-[10px]">
                {user?.primaryEmailAddress?.emailAddress || userId}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Github Clone Dialog - Controlled by Sidebar */}
      <GithubCloneDialog open={githubDialogOpen} onOpenChange={setGithubDialogOpen} />
    </>
  );
}