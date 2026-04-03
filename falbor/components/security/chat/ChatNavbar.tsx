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
    <div className="h-20 border-b bg-white flex items-center justify-between px-4 z-30 shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-md">Security Agent</h1>
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
                className="h-7 px-4 cursor-pointer rounded-sm bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-xs text-[12px] font-medium transition-all flex items-center gap-2">
                <div className="flex items-center gap-2 truncate">
                  <LayoutDashboard className="w-4 h-4 text-gray-800" />
                  <span className="truncate text-gray-800">
                    {selectedProject ? selectedProject.title : "Select Project"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 rounded-md border-zinc-200 shadow-xs overflow-hidden" align="start">
              <Command className="rounded-2xl">
                <CommandInput placeholder="Search projects..." className="h-10 text-xs" />
                <CommandList className="max-h-[200px] no-scrollbar">
                  <CommandEmpty className="py-6 text-xs text-zinc-500">No projects found.</CommandEmpty>
                  <CommandGroup className="p-1">
                    {projects.map((project) => (
                      <CommandItem
                        key={project.id}
                        value={project.id}
                        onSelect={() => {
                          onProjectSelect(project.id);
                          setIsProjectPopoverOpen(false);
                        }}
                        className="rounded-sm BackgroundStyle flex items-center py-2.5 px-3 cursor-pointer"
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
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Engine:</span>
          <Select value={selectedModel} onValueChange={onModelSelect}>
            <SelectTrigger className="h-72 px-4 cursor-pointer rounded-sm bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-xs text-[12px] font-medium transition-all flex items-center gap-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md border-zinc-200 shadow-xs overflow-hidden">
              {/* ZAI Models */}
              <SelectItem value="glm-4.7-flash" className="text-xs BackgroundStyle rounded-sm">GLM-4.7 Flash</SelectItem>
              <SelectItem value="glm-4.5-flash" className="text-xs BackgroundStyle rounded-sm">GLM-4.5 Flash</SelectItem>

              {/* OpenAI Models */}
              <SelectItem value="gpt-5.4" className="text-xs BackgroundStyle rounded-sm">GPT-5.4</SelectItem>
              <SelectItem value="gpt-5.4-pro" className="text-xs BackgroundStyle rounded-sm">GPT-5.4 Pro</SelectItem>
              <SelectItem value="gpt-5.1-codex" className="text-xs BackgroundStyle rounded-sm">GPT-5.1 Codex</SelectItem>

              {/* Anthropic Models */}
              <SelectItem value="claude-3.5-sonnet" className="text-xs BackgroundStyle rounded-sm">Claude 3.5 Sonnet</SelectItem>
              <SelectItem value="claude-3.5-haiku" className="text-xs BackgroundStyle rounded-sm">Claude 3.5 Haiku</SelectItem>
              <SelectItem value="claude-sonnet-4.6" className="text-xs BackgroundStyle rounded-sm">Claude 4.6 Sonnet</SelectItem>

              {/* Google Models */}
              <SelectItem value="gemini-2.0-flash" className="text-xs BackgroundStyle rounded-sm">Gemini 2.0 Flash</SelectItem>

              {/* X.AI Models */}
              <SelectItem value="grok-4" className="text-xs BackgroundStyle rounded-sm">Grok-4</SelectItem>
              <SelectItem value="grok-3-mini" className="text-xs BackgroundStyle rounded-sm">Grok-3 Mini</SelectItem>

              {/* Specialized Models */}
              <SelectItem value="qwen-3.5-35b" className="text-xs BackgroundStyle rounded-sm">Qwen 3.5</SelectItem>
              <SelectItem value="nemotron-3-super-120b" className="text-xs BackgroundStyle rounded-sm">Nemotron-3 (Free)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-4 top-4 relative">

      </div>
    </div>
  );
}
