"use client";

import { LayoutDashboard, ChevronDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { HomeTabs } from "@/components/home/home-tabs";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  title: string;
  updated_at: string;
  publishedUrl?: string;
}

interface ChatNavbarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (id: string) => void;
  selectedModel: string;
  onModelSelect: (model: string) => void;
  isProjectPopoverOpen: boolean;
  setIsProjectPopoverOpen: (open: boolean) => void;
}

export function ChatNavbar({
  projects,
  selectedProjectId,
  onProjectSelect,
  selectedModel,
  onModelSelect,
  isProjectPopoverOpen,
  setIsProjectPopoverOpen,
}: ChatNavbarProps) {
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="h-20 border-b bg-white flex items-center justify-between px-8 z-30 shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            <h1 className="font-black text-lg tracking-tight uppercase">Security Agent</h1>
          </div>
        </div>

        <Separator orientation="vertical" className="h-8 bg-zinc-100" />

        {/* Project Selection Button */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Project:</span>
          <Popover open={isProjectPopoverOpen} onOpenChange={setIsProjectPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-10 px-4 rounded-xl border-zinc-200 bg-zinc-50 hover:bg-zinc-100 font-bold text-xs gap-2 min-w-[180px] justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <LayoutDashboard className="w-4 h-4 text-gray-800" />
                  <span className="truncate text-gray-800">
                    {selectedProject ? selectedProject.title : "Select Project"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 rounded-2xl border-zinc-200 shadow-2xl overflow-hidden" align="start">
              <Command className="rounded-2xl">
                <CommandInput placeholder="Search projects..." className="h-10 text-xs" />
                <CommandList className="max-h-[200px] no-scrollbar">
                  <CommandEmpty className="py-6 text-xs text-zinc-500">No projects found.</CommandEmpty>
                  <CommandGroup className="p-2">
                    {projects.map((project) => (
                      <CommandItem
                        key={project.id}
                        onSelect={() => {
                          onProjectSelect(project.id);
                          setIsProjectPopoverOpen(false);
                        }}
                        className="rounded-xl flex items-center py-2.5 px-3 cursor-pointer"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                        <span className={cn(
                          "text-xs font-medium truncate",
                          selectedProjectId === project.id ? "text-teal-600 font-bold" : "text-zinc-600"
                        )}>
                          {project.title}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-100 px-3 py-1.5 rounded-xl ml-2">
          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Engine:</span>
          <Select value={selectedModel} onValueChange={onModelSelect}>
            <SelectTrigger className="w-[110px] h-5 text-[10px] p-0 bg-transparent border-none shadow-none focus:ring-0 font-black uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="glm-4.7-flash" className="text-xs">GLM-4.7 Flash</SelectItem>
              <SelectItem value="glm-4.5-flash" className="text-xs">GLM-4.5 Flash</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-4 top-4 relative">
        <HomeTabs />
      </div>
    </div>
  );
}
