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
  UserCircle,
  ParkingCircleIcon,
  Sparkles,
  CreditCard,
  BarChart3,
  Globe,
  Code2,
  Database,
  ArrowLeft,
  Mail,
  HardDrive,
  Cpu,
  ShieldCheck,
  Shield,
  Key,
  CheckSquare,
  Github,
  Terminal,
  Package,
  History,
  Rocket
} from 'lucide-react';
import { useWorkbench } from '@/lib/workbench-context';
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
import { Badge } from '../ui/badge';
import { HomeTabs } from '../home/home-tabs';
import { PluginsModal } from '../plugins/PluginsModal';

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

const ProjectItemRow = ({
  project,
  handleToggleFavorite,
  handleCopyId,
  handleDeleteProject,
  setIsProjectMenuOpen
}: {
  project: ProjectItem;
  handleToggleFavorite: (id: string, e: React.MouseEvent) => void;
  handleCopyId: (id: string, e: React.MouseEvent) => void;
  handleDeleteProject: (id: string, e: React.MouseEvent) => void;
  setIsProjectMenuOpen: (open: boolean) => void;
}) => (
  <div className="group flex items-center gap-2 px-1 z-[50] rounded-sm BackgroundStyle border border-transparent hover:border-border transition-all relative">
    <Link href={`/chat/${project.id}`} className="flex items-center gap-3 flex-1 min-w-0 py-0.5">
      <div className={cn(
        "flex-shrink-0 h-6 w-6 rounded-md flex items-center justify-center transition-colors",
        project.is_owner ? "text-foreground" : "text-foreground"
      )}>
        {project.is_github_clone && project.github_url ? (
          <GitBranch className="h-3.5 w-3.5" />
        ) : project.is_owner ? (
          <Circle className="h-3 w-3" />
        ) : (
          <Users className="h-3.5 w-3.5" />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[12px] font-medium text-muted-foreground truncate group-hover:text-foreground transition-colors">
          {project.title || 'Untitled Project'}
        </span>
      </div>
    </Link>
    <DropdownMenu onOpenChange={setIsProjectMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="cursor-pointer h-5 w-5 p-0 hover:bg-zinc-200 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 top-1/2 -translate-y-1/2"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <MoreHorizontal className="h-3 w-3 text-zinc-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 z-[200] absolute left-0">
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
  const [isHovered, setIsHovered] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isPluginsModalOpen, setIsPluginsModalOpen] = useState(false);

  // Update local state when props change
  useEffect(() => {
    if (initialProjects) {
      setProjects(initialProjects);
    }
  }, [initialProjects]);

  // Fetch projects if not provided
  useEffect(() => {
    if (!initialProjects || initialProjects.length === 0) {
      const fetchProjects = async () => {
        try {
          const res = await fetch('/api/projects');
          if (res.ok) {
            const data = await res.json();
            const mapped = data.projects.map((p: any) => ({
              ...p,
              updated_at: p.updatedAt || p.updated_at || new Date().toISOString(),
              is_owner: p.userId === userId
            }));
            setProjects(mapped);
          }
        } catch (err) {
          console.error("Sidebar failed to fetch projects:", err);
        }
      };
      fetchProjects();
    }
  }, [userId, initialProjects]);

  // Hover logic to open/close sidebar is handled by onMouseEnter/onMouseLeave on the container.
  // We keep the container width dynamic based on effectiveHovered.


  const {
    activeTab,
    setActiveTab,
    databaseTab,
    setDatabaseTab,
    settingsSection,
    setSettingsSection,
    setActivePluginId,
    pluginRegistry
  } = useWorkbench();

  // Helper for dynamic icons in plugins
  const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
    const LucideIcons = require('lucide-react');
    const IconComponent = LucideIcons[name] || LucideIcons.Package;
    return <IconComponent className={className} />;
  }

  const pathname = usePathname();
  const isSettingsPage = pathname?.startsWith('/settings');
  const isChatPage = pathname?.startsWith('/chat/');
  const isHomePage = pathname === '/' || pathname === '';
  const isTemplatesPage = pathname?.startsWith('/templates');
  const isPricingPage = pathname?.startsWith('/pricing');
  const isProjectsPage = pathname?.startsWith('/projects');
  const isSecurityPage = pathname?.startsWith('/super-security');
  const isProfilePage = pathname?.startsWith('/profile');
  const isAlwaysOpenPage = isHomePage || isTemplatesPage || isPricingPage || isProjectsPage || isSecurityPage || isProfilePage;

  const effectiveHovered = isAlwaysOpenPage ? true : (isChatPage ? true : (isSettingsPage ? true : (isHovered || searchOpen || isActionMenuOpen || isProjectMenuOpen)));

  const favoriteProjects = projects.filter(p => p.is_favorite);
  const recentProjects = projects.filter(p => !p.is_favorite);

  const filteredProjects = searchQuery
    ? projects.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleToggleFavorite = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, is_favorite: !p.is_favorite } : p
    ));
    try {
      const res = await fetch(`/api/projects/${projectId}/favorite`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to toggle favorite");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update favorite status");
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, is_favorite: !p.is_favorite } : p
      ));
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project?")) return;
    setProjects(prev => prev.filter(p => p.id !== projectId));
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete project");
      toast.success("Project deleted");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete project");
      router.refresh();
    }
  };

  const handleCopyId = (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(projectId);
    toast.success("Project ID copied to clipboard");
  };


  return (
    <>
      <div
        ref={menuRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'fixed top-[-10px] left-0 h-screen transition-all duration-300 ease-in-out z-[100] flex flex-col bg-none',
          isAlwaysOpenPage ? 'w-[180px] transition-none' : ((isChatPage || isSettingsPage) ? 'w-[160px] transition-none' : (effectiveHovered ? 'w-[180px]' : 'w-[64px]')),
          className
        )}
      >
        {isChatPage ? (
          <div className="flex flex-col h-full">
            {/* Chat Mode Sidebar Header */}
            <div className="ml-2 mt-15 pb-2 space-y-1 flex-1 overflow-y-auto no-scrollbar">
              <Link href="/" className='flex flex-col gap-1'>
                <Button className={cn(
                  "py-2 bg-transparent text-foreground border border-[#0099ff] bg-background BackgroundStyleButton rounded-full flex items-center gap-2 justify-start w-full px-3.5 py-1",
                )}>
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-[13px]">Back</span>
                </Button>
              </Link>

              <Button
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "py-2 bg-transparent border-none rounded-md flex items-center gap-2 justify-start w-full px-3.5 py-1 transition-all",
                  "text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white",
                  activeTab === "preview"
                    ? "BackgroundStyleButton text-foreground dark:text-white font-bold"
                    : "BackgroundStyle hover:bg-zinc-200/50 dark:hover:bg-white/10"
                )}
              >
                <Globe className={cn("h-4 w-4 shrink-0", activeTab === "preview" ? "text-primary dark:text-white" : "text-muted-foreground dark:text-white/60")} />
                <span className="font-medium text-[13px]">Preview</span>
              </Button>

              <Button
                onClick={() => setActiveTab("code")}
                className={cn(
                  "py-2 bg-transparent border-none rounded-md flex items-center gap-2 justify-start w-full px-3.5 py-1 transition-all",
                  "text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white",
                  activeTab === "code"
                    ? "BackgroundStyleButton text-foreground dark:text-white font-bold"
                    : "BackgroundStyle hover:bg-zinc-200/50 dark:hover:bg-white/10"
                )}
              >
                <Code2 className={cn("h-4 w-4 shrink-0", activeTab === "code" ? "text-primary dark:text-white" : "text-muted-foreground dark:text-white/60")} />
                <span className="font-medium text-[13px]">Code</span>
              </Button>

              <div className="pt-2 mt-2 border-t border-border flex flex-col gap-1">
                {[
                  { id: "tables", icon: Database, label: "Database" },
                  { id: "users", icon: Users, label: "Authentication" },
                  { id: "ai", icon: Sparkles, label: "AI Settings" },
                  { id: "usage", icon: BarChart3, label: "Consumption" },
                  { id: "auth_providers", icon: ShieldCheck, label: "Social Auth" },
                  { id: "feedback", icon: MessageSquare, label: "Analytics" },
                  { id: "emails", icon: Mail, label: "Emails" },
                  { id: "storage", icon: HardDrive, label: "Storage" },
                  { id: "functions", icon: Cpu, label: "Functions" },
                ].map((item) => (
                  <Button
                    key={item.id}
                    onClick={() => {
                      setActiveTab("database");
                      setDatabaseTab(item.id as any);
                    }}
                    className={cn(
                      "py-2 bg-transparent border-none rounded-md flex items-center gap-2 justify-start w-full px-3.5 py-1 transition-all",
                      "text-muted-foreground hover:text-foreground dark:text-white/60 dark:hover:text-white",
                      activeTab === "database" && databaseTab === item.id
                        ? "BackgroundStyleButton text-foreground dark:text-white font-bold shadow-sm"
                        : "BackgroundStyle hover:bg-zinc-200/50 dark:hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className={cn("h-4 w-4 shrink-0", activeTab === "database" && databaseTab === item.id ? "text-primary dark:text-white" : "text-muted-foreground dark:text-white/60")} />
                      <span className="font-medium text-[13px]">{item.label}</span>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="pt-2 mt-2 border-t border-border flex flex-col gap-1">
                {[
                  { id: "project-settings", label: "General", icon: Settings },
                  { id: "sushi", label: "Social Content", icon: Rocket },
                  { id: "analytics", label: "Analytics", icon: BarChart3, soon: true }, // ⭐ soon feature
                  { id: "security", label: "Security", icon: Shield },
                  { id: "publish-template", label: "Publish Template", icon: FileText },
                  { id: "secrets", label: "Secrets", icon: Key },
                  { id: "automations", label: "Automations", icon: CheckSquare },
                  { id: "github", label: "GitHub", icon: Github },
                  { id: "plugins", label: "Plugins", icon: Package },
                  { id: "versions", label: "Versions", icon: History, isNew: true },
                ].map((item) => (
                  <Button
                    key={item.id}
                    onClick={() => {
                      if (item.soon) return; // 🚫 block navigation
                      if (item.id === "plugins") {
                        setIsPluginsModalOpen(true);
                        return;
                      }
                      setActiveTab("settings");
                      setSettingsSection(item.id as any);
                    }}
                    className={cn(
                      "py-2 bg-transparent rounded-md flex items-center gap-2 justify-start w-full px-3.5 py-1 transition-all",
                      "text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white",
                      activeTab === "settings" && settingsSection === item.id
                        ? "BackgroundStyleButton text-foreground dark:text-white font-bold shadow-sm"
                        : "BackgroundStyle hover:bg-zinc-200/50 dark:hover:bg-white/10",
                      item.soon ? "opacity-50 cursor-not-allowed" : "",
                      "w-full px-3.5"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", activeTab === "settings" && settingsSection === item.id ? "text-primary dark:text-white" : "text-muted-foreground dark:text-white/60")} />

                    <span className="font-medium text-[13px] flex items-center gap-2">
                      {item.label}
                      {item.soon && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 rounded-sm">
                          Soon
                        </Badge>
                      )}
                      {item.isNew && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 rounded-sm">
                          New
                        </Badge>
                      )}
                    </span>
                  </Button>
                ))}

                {/* Plugin Sidebar Links */}
                {pluginRegistry.sidebarLinks.map((btn, idx) => (
                  <Button
                    key={`${btn.pluginId}-${idx}`}
                    onClick={() => btn.onClick({
                      sendPrompt: (p: string, isAuto = true) => (window as any).falbor.sendPrompt(p, isAuto),
                      setActivePlugin: (id: string | null) => (window as any).falbor.setActivePlugin(id),
                      getMessages: () => (window as any).falbor.getMessages(),
                      setPreviewUrl: (url: string) => window.dispatchEvent(new CustomEvent('falbor-set-preview-url', { detail: { url } }))
                    })}
                    className="py-2 bg-transparent text-zinc-700 BackgroundStyle rounded-sm flex items-center gap-2 justify-start w-full px-3.5 py-1"
                  >
                    {btn.icon ? (
                      <div className="h-4 w-4 shrink-0 flex items-center justify-center">
                        <DynamicIcon name={btn.icon} className="h-4 w-4" />
                      </div>
                    ) : (
                      <Package className="h-4 w-4 shrink-0" />
                    )}
                    <span className="font-medium text-[13px]">{btn.label || "Plugin Action"}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : isSettingsPage ? (
          <div className="flex flex-col h-full">
            {/* Settings Mode Sidebar Header */}
            <div className="ml-2 mt-15 pb-2 space-y-1 flex-1 overflow-y-auto no-scrollbar">
              <Link href="/" className='flex flex-col gap-1'>
                <Button className={cn(
                  "py-2 bg-transparent text-foreground border border-[#0099ff] bg-background BackgroundStyleButton rounded-full flex items-center gap-2 justify-start w-full px-3.5 py-1",
                )}>
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-[13px]">Back</span>
                </Button>
              </Link>

              <div className="flex flex-col gap-1">
                {[
                  { id: "/settings/account", label: "Account", icon: UserCircle },
                  { id: "/settings/billing", label: "Billing", icon: CreditCard },
                  { id: "/settings/usage", label: "Usage", icon: BarChart3 },
                  { id: "/settings/mcp", label: "MCP", icon: Cpu },
                  { id: "/settings/api-keys", label: "API Keys", icon: Key },
                  { id: "/settings/skills", label: "Skills", icon: Sparkles },
                ].map((item) => (
                  <Link href={item.id} key={item.id}>
                    <Button
                      className={cn(
                        "py-2 bg-transparent text-zinc-700 dark:text-white/80 BackgroundStyle rounded-sm flex items-center gap-2 justify-start w-full px-3.5 py-1",
                        pathname === item.id ? "BackgroundStyleButton text-black dark:text-white" : "hover:text-zinc-900"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", pathname === item.id ? "text-black dark:text-white" : "text-zinc-500 dark:text-white/80")} />
                      {effectiveHovered && <span className="font-medium text-[13px]">{item.label}</span>}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>

            {/* Footer with user profile */}
            {user && (
              <div className="mb-3 ml-3 pr-3">
                <div onClick={() => openUserProfile()} className="flex items-center gap-3 px-2 py-2 rounded-lg BackgroundStyle hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer group">
                  {user.imageUrl ? <img src={user.imageUrl} alt="User" className="h-8 w-8 rounded-full object-cover shadow-sm" /> : <div className="h-8 w-8 rounded-full bg-zinc-500 flex items-center justify-center text-white text-xs font-bold">{user.firstName?.slice(0, 1)}</div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground truncate">{user.fullName || "User"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.primaryEmailAddress?.emailAddress}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header Section */}
            <div className="ml-3 mt-15 pb-2 space-y-1 pr-3 flex-1 overflow-y-auto no-scrollbar">
              {effectiveHovered && (
                <div className="mb-2">
                  <HomeTabs />
                </div>
              )}
              {/* <div
                className={cn(
                  "flex items-center py-2 bg-transparent text-zinc-700 border border-[#0099ff] h-8 bg-white BackgroundStyleButton rounded-full flex items-center gap-2 justify-start w-full px-3.5 py-1",
                  effectiveHovered ? "w-full" : "w-10 mx-auto"
                )}
              >
                <Link href="/" className="flex-1">
                  <Button variant="ghost" className="w-full justify-start hover:bg-transparent h-8 p-0 flex items-center justify-center">
                    <Plus className={cn("h-4 w-4", effectiveHovered ? "ml-3" : "ml-[-14px]")} />
                    {effectiveHovered && <span className="font-semibold text-[13px]">New Chat</span>}
                  </Button>
                </Link>
                {effectiveHovered && (
                  <>
                    <div className="h-6 w-[1px] bg-gray-200"></div>
                    <DropdownMenu open={isActionMenuOpen} onOpenChange={setIsActionMenuOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "px-2.5 rounded-l-none bg-transparent hover:bg-transparent h-8 transition-transform duration-200",
                            isActionMenuOpen && "rotate-180"
                          )}
                        >
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 ml-15" side="bottom" sideOffset={8}>
                        <DropdownMenuItem onClick={() => {
                          setIsActionMenuOpen(false);
                          router.push('/templates');
                        }}>
                          <BookTemplate className="mr-2 h-4 w-4" />
                          Start from a template
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setIsActionMenuOpen(false);
                          setGithubDialogOpen(true);
                        }}>
                          <GitBranch className="mr-2 h-4 w-4" />
                          Import from GitHub
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div> */}

              {/* Search Section - Integrated Inline */}
              <div className="space-y-1">
                {!searchOpen ? (
                  <Button
                    onClick={() => setSearchOpen(true)}
                    className={cn(
                      "py-2 bg-transparent text-zinc-700 dark:text-white/80 BackgroundStyle rounded-sm flex items-center gap-2 justify-start w-full px-3.5 py-1",
                      "w-full px-3.5"
                    )}
                  >
                    <Search className="h-4 w-4 shrink-0" />
                    {effectiveHovered && <span className="font-medium text-[13px]">Search</span>}
                  </Button>
                ) : (
                  <div className="">
                    <div className="relative flex items-center">
                      <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-400" />
                      <Input
                        autoFocus
                        placeholder="Search projects..."
                        className="h-7 pl-8 pr-8 text-[13px] bg-[#2C2C30]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setSearchOpen(false);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 h-6 w-6 hover:bg-zinc-200"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                      >
                        <ChevronRight className="h-3 w-3 rotate-90" />
                      </Button>
                    </div>

                    {searchQuery && (
                      <div className="max-h-[200px] overflow-y-auto px-1 pb-1 animate-in fade-in slide-in-from-top-1">
                        {filteredProjects.length === 0 ? (
                          <div className="py-3 text-center text-[11px] text-zinc-500 italic">No matches found</div>
                        ) : (
                          filteredProjects.map(project => (
                            <Link
                              key={project.id}
                              href={`/chat/${project.id}`}
                              onClick={() => {
                                setSearchOpen(false);
                                setSearchQuery("");
                              }}
                              className="flex items-center gap-2 p-2 hover:bg-zinc-100 rounded-md text-[12px] text-zinc-600 transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5 text-zinc-400" />
                              <span className="truncate">{project.title}</span>
                            </Link>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Link href="/">
                <Button
                  className={cn(
                    "py-2 mb-1 bg-transparent text-zinc-700 dark:text-white/80 BackgroundStyle rounded-sm flex items-center gap-2 justify-start w-full px-3.5 py-1",
                    "w-full px-3.5"
                  )}
                >
                  <Home className="h-4 w-4 shrink-0" />
                  {effectiveHovered && <span className="font-medium text-[13px]">Home</span>}
                </Button>
              </Link>
              <Link href="/projects">
                <Button
                  className={cn(
                    "py-2 mb-1 bg-transparent text-zinc-700 dark:text-white/80 BackgroundStyle rounded-sm flex items-center gap-2 justify-start w-full px-3.5 py-1",
                    "w-full px-3.5"
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  {effectiveHovered && <span className="font-medium text-[13px]">Chats</span>}
                </Button>
              </Link>

              {effectiveHovered && (
                <div className="">
                  <Link href="/templates">
                    <Button
                      className={cn(
                        "py-2 mb-1 bg-transparent text-zinc-700 dark:text-white/80 BackgroundStyle rounded-sm flex items-center gap-2 justify-start w-full px-3.5 py-1",
                        "w-full px-3.5"
                      )}
                    >
                      <BookTemplate className="h-4 w-4 shrink-0" />
                      <span className="font-medium text-[13px]">Templates</span>
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button
                      className={cn(
                        "py-2 mb-1 bg-transparent text-zinc-700 dark:text-white/80 BackgroundStyle rounded-sm flex items-center gap-2 justify-start w-full px-3.5 py-1",
                        "w-full px-3.5"
                      )}
                    >
                      <CreditCard className="h-4 w-4 shrink-0" />
                      <span className="font-medium text-[13px]">Pricing</span>
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button
                      className={cn(
                        "py-2 mb-1 bg-transparent text-zinc-700 dark:text-white/80 BackgroundStyle rounded-sm flex items-center gap-2 justify-start w-full px-3.5 py-1",
                        "w-full px-3.5"
                      )}
                    >
                      <Settings className="h-4 w-4 shrink-0" />
                      <span className="font-medium text-[13px]">Settings</span>
                    </Button>
                  </Link>
                </div>
              )}

              {/* Projects List Under Main Buttons */}
              {effectiveHovered && (
                <div className="mt-4 space-y-4">
                  {favoriteProjects.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[13px] text-gray-800 dark:text-white/80">Favorites</div>
                      {favoriteProjects.map(project => (
                        <ProjectItemRow
                          key={project.id}
                          project={project}
                          handleToggleFavorite={handleToggleFavorite}
                          handleCopyId={handleCopyId}
                          handleDeleteProject={handleDeleteProject}
                          setIsProjectMenuOpen={setIsProjectMenuOpen}
                        />
                      ))}
                    </div>
                  )}
                  <div>
                    <div className="px-2 py-1 text-[13px] text-gray-800 dark:text-white/80">Recent Projects</div>
                    {recentProjects.map(project => (
                      <ProjectItemRow
                        key={project.id}
                        project={project}
                        handleToggleFavorite={handleToggleFavorite}
                        handleCopyId={handleCopyId}
                        handleDeleteProject={handleDeleteProject}
                        setIsProjectMenuOpen={setIsProjectMenuOpen}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {effectiveHovered && user && (
              <div className="mb-3 ml-3 pr-3">
                <div onClick={() => openUserProfile()} className="flex items-center gap-3 px-2 py-2 rounded-lg BackgroundStyle hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer group">
                  {user.imageUrl ? <img src={user.imageUrl} alt="User" className="h-8 w-8 rounded-full object-cover shadow-sm" /> : <div className="h-8 w-8 rounded-full bg-zinc-500 flex items-center justify-center text-white text-xs font-bold">{user.firstName?.slice(0, 1)}</div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground truncate">{user.fullName || "User"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.primaryEmailAddress?.emailAddress}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <PluginsModal
          isOpen={isPluginsModalOpen}
          onClose={() => setIsPluginsModalOpen(false)}
          onSelectPlugin={(id: string) => {
            setActivePluginId(id);
            setIsPluginsModalOpen(false);
          }}
        />
      </div>

      <GithubCloneDialog open={githubDialogOpen} onOpenChange={setGithubDialogOpen} />
    </>
  );
}