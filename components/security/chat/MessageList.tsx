"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Loader2,
  MousePointer2,
  Brain,
  ChevronDown,
  Search,
  Lightbulb,
  Bug,
  Folder,
  Globe,
  List,
  Terminal as TerminalIcon,
  CheckCircle2,
  ShieldAlert,
  ScanSearch,
  ClipboardCheck,
  Smartphone,
  Zap,
  Clock,
  Edit,
  RefreshCw,
  Copy,
  Database,
  MoreVertical,
  Circle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  type?: string;
  id?: string;
  url?: string;
}

interface MessageListProps {
  messages: Message[];
  currentScreenshot?: string | null;
  browserScanSteps?: any[];
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}

function parseAIResponse(content: string) {
  const tagRegexes: Record<string, RegExp> = {
    thinking: /<Thinking>([\s\S]*?)<\/Thinking>/gi,
    commentary: /<commentary>([\s\S]*?)<\/commentary>/gi,
    planning: /<Planning>([\s\S]*?)<\/Planning>/gi,
    search: /<Search>([\s\S]*?)<\/Search>/gi,
    scan: /<Scan>([\s\S]*?)<\/Scan>/gi,
    tasks: /<Tasks>([\s\S]*?)<\/Tasks>/gi,
  };

  const matches: Array<{ type: string; start: number; fullMatch: string; content: any }> = [];

  for (const [type, regex] of Object.entries(tagRegexes)) {
    for (const match of content.matchAll(regex)) {
      let parsedContent: any;
      if (type === "tasks") {
        const tasksContent = match[1].trim();
        const tasksList: { text: string; status: "success" | "loading" | "pending" }[] = [];
        tasksContent.split("\n").forEach((line: string) => {
          if (line.trim()) {
            const successMatch = line.match(/(.+?)\s*[✓✔]/i);
            const loadingMatch = line.match(/(.+?)\s*[⏳⌛…]/i);
            if (successMatch) {
              tasksList.push({ text: successMatch[1].trim(), status: "success" });
            } else if (loadingMatch) {
              tasksList.push({ text: loadingMatch[1].trim(), status: "loading" });
            } else {
              tasksList.push({ text: line.trim(), status: "pending" });
            }
          }
        });
        parsedContent = tasksList;
      } else {
        parsedContent = match[1].trim();
      }
      matches.push({ type, start: match.index!, fullMatch: match[0], content: parsedContent });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const parts: Array<{ type: string; content: any }> = [];
  let lastEnd = 0;
  for (const m of matches) {
    const textBefore = content.substring(lastEnd, m.start).trim();
    if (textBefore) {
      parts.push({ type: "text", content: textBefore });
    }
    parts.push({ type: m.type, content: m.content });
    lastEnd = m.start + m.fullMatch.length;
  }
  let finalText = content.substring(lastEnd).trim();

  if (finalText) {
    const safeText = finalText
      .replace(/<\/?(?:Thinking|Commentary|Planning|Search|Scan|Tasks)[^>]*>/gi, "")
      .replace(/<<SCAN_RESULTS>>[\s\S]*?<(\/|\\\/)?SCAN_RESULTS>>/gi, "")
      .trim();
    if (safeText) {
      parts.push({ type: "text", content: safeText });
    }
  }

  return { parts };
}

export function MessageList({ messages, currentScreenshot, browserScanSteps, chatEndRef }: MessageListProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "thinking": return Brain;
      case "planning": return Lightbulb;
      case "search": return Search;
      case "scan": return ScanSearch;
      case "tasks": return List;
      default: return Brain;
    }
  };

  const getTitle = (type: string) => {
    switch (type) {
      case "thinking": return "Thinking Process";
      case "planning": return "Security Plan";
      case "search": return "Knowledge Discovery";
      case "scan": return "Context Scan";
      case "tasks": return "Security Pipeline";
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const renderPartContent = (type: string, content: any) => {
    if (type === "tasks") {
      return (
        <div className="space-y-1.5 mt-2 p-3">
          {content.map((task: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-zinc-600">
              {task.status === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" />}
              {task.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />}
              {task.status === "pending" && <Circle className="w-3.5 h-3.5 text-gray-300" />}
              <span className={cn(task.status === "success" && "line-through text-zinc-400")}>{task.text}</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="p-3 text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto no-scrollbar">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  };

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-4xl mx-auto space-y-8 p-10">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.type === 'browser-agent' ? (
              <Card className="w-full bg-zinc-950 border-zinc-800 rounded-2xl overflow-hidden shadow-2xl border-2">
                <div className="flex flex-col sm:flex-row border-b border-zinc-900 h-[500px]">
                  <div className="flex-1 bg-zinc-900 relative min-h-[300px]">
                    {currentScreenshot ? (
                      <div className="w-full h-full">
                        <img src={`data:image/jpeg;base64,${currentScreenshot}`} className="w-full h-full object-cover" alt="Page View" />
                        <div className="absolute top-1/2 left-1/2 animate-bounce">
                          <MousePointer2 className="w-6 h-6 text-teal-400 fill-teal-400/20 drop-shadow-lg" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-zinc-800 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="w-full sm:w-72 bg-zinc-950 border-t sm:border-t-0 sm:border-l border-zinc-900 flex flex-col">
                    <div className="p-3 border-b border-zinc-900 bg-zinc-900/30 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Runtime Analytics</div>
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {browserScanSteps?.map((step, si) => (
                          <div key={si} className="text-[11px] font-mono text-zinc-400 border-l-2 border-teal-500/50 pl-3 py-1">
                            {step.message}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </Card>
            ) : msg.role === "assistant" ? (
              <div className="w-full max-w-[85%] space-y-2">
                <div className="flex items-center gap-2 mb-2 ml-2">
                  <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center border border-teal-100">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Security Agent</span>
                </div>

                <div className="bg-white border border-zinc-100 rounded-3xl rounded-tl-none p-6 shadow-sm space-y-4">
                  {(() => {
                    const { parts } = parseAIResponse(msg.content);
                    return parts.map((part, pIdx) => {
                      if (part.type === "text") {
                        return (
                          <div key={pIdx} className="prose prose-sm max-w-none text-zinc-800 font-medium leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.content}</ReactMarkdown>
                          </div>
                        );
                      }

                      const Icon = getIcon(part.type);
                      const title = getTitle(part.type);
                      const sectionKey = `msg-${i}-part-${pIdx}`;
                      const isOpen = expandedSections[sectionKey] || false;

                      return (
                        <Collapsible
                          key={pIdx}
                          open={isOpen}
                          onOpenChange={() => toggleSection(sectionKey)}
                          className="border border-zinc-100 rounded-2xl overflow-hidden bg-zinc-50/50"
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between px-4 py-3 h-auto hover:bg-zinc-100/50 group">
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-teal-600" />
                                <span className="text-xs font-bold text-zinc-600 uppercase tracking-tight">{title}</span>
                              </div>
                              <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="border-t border-zinc-100 bg-white">
                            {renderPartContent(part.type, part.content)}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              <div className="max-w-[85%] p-4 sm:p-6 rounded-3xl text-[14px] leading-relaxed font-medium shadow-sm bg-teal-600 text-white rounded-tr-none">
                {msg.content}
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <br />
      <br />
      <br />
      <br />
    </ScrollArea>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
