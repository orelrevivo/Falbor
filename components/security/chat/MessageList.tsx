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
    usermessage: /<UserMessage>([\s\S]*?)<\/UserMessage>/gi,
    review: /<Review>([\s\S]*?)<\/Review>/gi,
    results: /<<SCAN_RESULTS>>([\s\S]*?)<\/SCAN_RESULTS>>/gi,
    rawjson: /(?:^|\n)\{([\s\S]*?puntuación|score[\s\S]*?)\}(?:\n|$)/gi,
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
      .replace(/<\/?(?:Thinking|Commentary|Planning|Search|Scan|Tasks|UserMessage|Implosion|Review|Results)[^>]*>/gi, "")
      .replace(/<<SCAN_RESULTS>>[\s\S]*?<\/SCAN_RESULTS>>|<<SCAN_RESULTS>>[\s\S]*?<\\\/SCAN_RESULTS>>/gi, "")
      .replace(/<>\s*\{[\s\S]*?\}\s*<\/>/gi, "") // Handle fragment-like JSON
      .replace(/\{[\s\S]*?"(score|puntuación)"[\s\S]*?\}/gi, "") // Generic JSON cleanup
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
      case "usermessage": return "Suggested Action";
      case "implosion": return "System Implosion";
      case "results":
      case "rawjson": return "Audit Scoreboard";
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const renderPartContent = (type: string, content: any) => {
    if (type === "usermessage") {
      return (
        <div className="p-3">
          <Button
            className="w-full justify-between h-9 bg-zinc-950 hover:bg-zinc-800 text-white rounded-sm text-[12px] px-4 font-medium transition-all group"
            onClick={() => {
              // Logic to send message should be passed down or handled via custom event
              const event = new CustomEvent('security-action-click', { detail: content });
              window.dispatchEvent(event);
            }}
          >
            <span className="truncate">{content}</span>
            <Zap className="w-3 h-3 text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>
        </div>
      );
    }

    if (type === "results" || type === "rawjson") {
      let data: any;
      try {
        const jsonStr = type === "rawjson" ? `{${content}}` : content;
        data = JSON.parse(jsonStr.trim());
      } catch (e) {
        return <div className="p-3 text-xs text-zinc-400 italic">Invalid audit data format</div>;
      }

      const score = data.score || data.puntuación || 0;
      const findings = data.findings || data.hallazgos || [];

      return (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between bg-zinc-50 border border-zinc-100 p-4 rounded-md">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle className="text-zinc-200 stroke-current" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
                  <circle className="text-teal-500 stroke-current" strokeWidth="10" strokeLinecap="round" fill="transparent" r="40" cx="50" cy="50" strokeDasharray={`${score * 2.51} 251`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-black text-xs">{score}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Security Health</div>
                <div className="text-[12px] font-bold text-gray-800">
                  {score >= 80 ? "Peak Security" : score >= 60 ? "Moderate Protection" : "Action Required"}
                </div>
              </div>
            </div>
            <Button variant="ghost" className="text-[11px] text-teal-600 font-bold hover:bg-teal-50" onClick={() => {
              const event = new CustomEvent('security-action-click', { detail: "Generate detailed security report PDF" });
              window.dispatchEvent(event);
            }}>
              Sync UI
            </Button>
          </div>

          {findings.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Critical Findings</div>
              <div className="grid grid-cols-1 gap-2">
                {findings.slice(0, 3).map((f: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-zinc-100 rounded-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        (f.severity || f.gravedad) === "Critical" || (f.severity || f.gravedad) === "Crítica" ? "bg-red-500" :
                          (f.severity || f.gravedad) === "High" || (f.severity || f.gravedad) === "Alta" ? "bg-orange-500" : "bg-blue-500"
                      )} />
                      <span className="text-[12px] font-bold text-gray-700 truncate max-w-[200px]">{f.title || f.título}</span>
                    </div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase">{(f.severity || f.gravedad)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (type === "implosion") {
      return (
        <div className="p-3 space-y-3">
          <div className="bg-red-50 border border-red-100 p-3 rounded-md text-[11px] text-red-700 font-medium">
            <ShieldAlert className="w-3 h-3 mb-1" />
            Warning: Implosion will perform a deep security hardening and cleanup. This is a destructive optimization designed for peak security.
          </div>
          <Button
            className="w-full h-9 bg-red-600 hover:bg-red-700 text-white rounded-sm text-[12px] font-black uppercase tracking-widest gap-2"
            onClick={() => {
              const event = new CustomEvent('security-action-click', { detail: `[IMPLOSION] ${content}` });
              window.dispatchEvent(event);
            }}
          >
            <RefreshCw className="w-3 h-3" />
            Trigger Deep Implosion
          </Button>
        </div>
      );
    }

    return (
      <div className="p-3 text-sm text-zinc-600 leading-relaxed max-h-[400px] overflow-y-auto no-scrollbar">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ node, ...props }) => (
              <div className="my-4 overflow-x-auto rounded-md border border-zinc-200 bg-white">
                <table className="min-w-full divide-y divide-zinc-200 border-collapse" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => <thead className="bg-zinc-50" {...props} />,
            th: ({ node, ...props }) => (
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500 bg-zinc-50/50" {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className="px-4 py-3 text-[12px] text-zinc-600 border-t border-zinc-100 font-medium" {...props} />
            ),
            tr: ({ node, ...props }) => <tr className="hover:bg-zinc-50/30 transition-colors" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-4xl mx-auto space-y-8 p-10">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.type === 'browser-agent' ? (
              <Card className="w-full">
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
                <div className="w-full space-y-4 text-[13px] rounded-lg p-6">
                  {(() => {
                    const { parts } = parseAIResponse(msg.content);
                    return parts.map((part, pIdx) => {
                      if (part.type === "text") {
                        return (
                          <div key={pIdx} className="w-full">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({ node, ...props }) => <h1 className="text-lg font-black uppercase tracking-tight text-gray-900 mt-6 mb-4 border-l-2 border-zinc-800 pl-3" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-md font-black uppercase tracking-wider text-gray-800 mt-5 mb-3" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-gray-700 mt-3 mb-2" {...props} />,
                                p: ({ node, ...props }) => <p className="text-[13px] text-gray-700 leading-relaxed mb-4" {...props} />,
                                ul: ({ node, ...props }) => <ul className="space-y-1.5 mb-4 ml-1" {...props} />,
                                li: ({ node, ...props }) => (
                                  <li className="flex items-start gap-2 text-[13px] text-gray-700 font-medium before:content-['•'] before:text-zinc-400 before:mr-1 before:shrink-0" {...props} />
                                ),
                                hr: ({ node, ...props }) => <hr className="my-8 border-zinc-100" {...props} />,
                                table: ({ node, ...props }) => (
                                  <div className="my-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
                                    <table className="min-w-full divide-y divide-zinc-200 border-collapse" {...props} />
                                  </div>
                                ),
                                thead: ({ node, ...props }) => <thead className="bg-zinc-50" {...props} />,
                                th: ({ node, ...props }) => (
                                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-50/50" {...props} />
                                ),
                                td: ({ node, ...props }) => (
                                  <td className="px-5 py-4 text-[13px] text-zinc-600 border-t border-zinc-100 font-medium" {...props} />
                                ),
                                tr: ({ node, ...props }) => <tr className="hover:bg-zinc-50/30 transition-colors" {...props} />,
                                code: ({ node, inline, ...props }: any) =>
                                  inline
                                    ? <code className="bg-zinc-100 text-teal-700 px-1.5 py-0.5 rounded-sm text-[12px]" {...props} />
                                    : <code className="block BackgroundStyleButton text-gray-800 p-2 rounded-md text-[12px] my-1 overflow-x-auto" {...props} />
                              }}
                            >
                              {part.content}
                            </ReactMarkdown>
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
                          className="border border-zinc-200/50 rounded-md overflow-hidden bg-white/50"
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between px-4 py-2.5 h-auto hover:bg-zinc-100/30 group">
                              <div className="flex items-center gap-2.5">
                                <Icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" />
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{getTitle(part.type)}</span>
                              </div>
                              <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-300 transition-transform", isOpen && "rotate-180")} />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="border-t border-zinc-100/50">
                            {renderPartContent(part.type, part.content)}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              <div className="w-full rounded-lg px-6 py-5 text-[13px] BackgroundStyleButton border border-zinc-200/50 leading-relaxed">
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