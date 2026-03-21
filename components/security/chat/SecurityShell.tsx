"use client";

import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Copy,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Search,
  LayoutDashboard,
  Terminal,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatNavbar } from "./ChatNavbar";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { updateSecuritySession } from "@/app/actions/security";

interface Finding {
  id: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  title: string;
  explanation: string;
  details?: string;
  isAIRisk?: boolean;
}

interface Project {
  id: string;
  title: string;
  updated_at: string;
  publishedUrl?: string;
}

interface SecuritySession {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  messages: any[];
  scanResults: any;
  selectedModel: string;
  consoleLogs: any[];
  createdAt: Date;
  updatedAt: Date;
}

export function SecurityShell({ session, projects }: { session: SecuritySession; projects: Project[] }) {
  const [mounted, setMounted] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(session.projectId);
  const [selectedModel, setSelectedModel] = useState(session.selectedModel || "glm-4.7-flash");
  const [messages, setMessages] = useState<any[]>(session.messages || []);
  const [input, setInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [score, setScore] = useState<number | null>(session.scanResults?.score || null);
  const [findings, setFindings] = useState<Finding[]>(session.scanResults?.findings || []);
  const [badgeCode, setBadgeCode] = useState(session.scanResults?.badgeCode || "");

  const generateBadgeFromScore = (s: number): string => {
    const color = s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';
    const label = s >= 80 ? 'SECURED' : s >= 60 ? 'MODERATE' : 'AT RISK';
    return `<div style="display:inline-flex;align-items:center;gap:10px;background:${color};color:white;padding:10px 20px;border-radius:10px;font-family:system-ui,sans-serif;font-weight:700;font-size:14px;box-shadow:0 4px 14px rgba(0,0,0,0.2)"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/></svg><span>Security Score: ${s}/100 · ${label}</span></div>`;
  };
  const [activeTab, setActiveTab] = useState("chat");
  const [consoleLogs, setConsoleLogs] = useState<any[]>(session.consoleLogs || []);
  const [consoleInput, setConsoleInput] = useState("");
  const [isProjectPopoverOpen, setIsProjectPopoverOpen] = useState(false);

  // Browser Agent State
  const [isBrowserScanning, setIsBrowserScanning] = useState(false);
  const [browserScanSteps, setBrowserScanSteps] = useState<any[]>([]);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle auto-saving session
  useEffect(() => {
    if (mounted) {
      const saveSession = async () => {
        try {
          await updateSecuritySession(session.id, {
            messages,
            scanResults: score !== null ? { score, findings, badgeCode } : null,
            projectId: selectedProjectId,
            selectedModel,
            consoleLogs,
          } as any);
        } catch (error) {
          console.error("Failed to save session:", error);
        }
      };
      const debounce = setTimeout(saveSession, 2000);
      return () => clearTimeout(debounce);
    }
  }, [messages, score, findings, badgeCode, selectedProjectId, selectedModel, consoleLogs, mounted, session.id]);

  const handleSendMessage = async (customMessage?: string, displayMessage?: string) => {
    const userMsg = customMessage || input;
    if (!userMsg.trim()) return;
    if (!customMessage) setInput("");

    const newMessages = [...messages, { role: "user", content: displayMessage || userMsg }];
    setMessages(newMessages);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          projectId: selectedProjectId,
          securityMode: true,
          selectedModel: selectedModel,
          targetProjectId: selectedProjectId,
          history: newMessages.slice(-10),
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      const assistantMsgObj = { role: "assistant", content: "" };
      setMessages(prev => [...prev, assistantMsgObj]);

      while (true) {
        const { done, value } = await reader?.read() || { done: true, value: undefined };
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                assistantMessage += data.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1].content = assistantMessage;
                  return updated;
                });

                // Check for JSON results block
                if (assistantMessage.includes("<<SCAN_RESULTS>>") && assistantMessage.includes("<</SCAN_RESULTS>>")) {
                  try {
                    const jsonStr = assistantMessage.split("<<SCAN_RESULTS>>")[1].split("<</SCAN_RESULTS>>")[0];
                    const data = JSON.parse(jsonStr.trim());
                    if (data.score !== undefined) setScore(data.score);
                    if (data.findings) setFindings(data.findings);
                  } catch (e) {
                    console.error("Failed to parse scan results:", e);
                  }
                }
              }
            } catch (e) { }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAIRiskScan = async () => {
    if (!selectedProjectId) return;
    const project = projects.find(p => p.id === selectedProjectId);
    const scanPrompt = `Execute a specialized AI Code Risk Audit for "${project?.title}". 
Specifically scan for:
1. Hallucinated or non-existent dependencies.
2. Insecure LLM-common patterns (disabled CSRF, open CORS, dangerouslySetInnerHTML).
3. AI-inserted hardcoded secrets or placeholders.
4. Missing sanitization for prompt injection risks.

Format your findings with [AI-origin risk] tags.`;

    await handleSendMessage(scanPrompt, `System: Initiating Specialized AI Code Risk Audit...`);
  };

  const runConsoleCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    setConsoleInput("");
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev, { type: 'INFO', text: `$ ${cmd}`, time: timestamp }]);

    if (!selectedProjectId) {
      setConsoleLogs(prev => [...prev, { type: 'WARN', text: 'No project selected. Select a project to run security commands.', time: new Date().toLocaleTimeString() }]);
      return;
    }

    setConsoleLogs(prev => [...prev, { type: 'INFO', text: 'Connecting to Security Shell AI...', time: new Date().toLocaleTimeString() }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `[SECURE SHELL] Execute this security command and respond in terminal-style output (concise, no markdown): ${cmd}`,
          projectId: selectedProjectId,
          securityMode: true,
          selectedModel: selectedModel,
          targetProjectId: selectedProjectId,
          history: [],
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let output = "";

      while (true) {
        const { done, value } = await reader?.read() || { done: true, value: undefined };
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) output += data.text;
            } catch (e) {}
          }
        }
      }

      // Strip scan results JSON block and display lines
      const cleaned = output.replace(/<<SCAN_RESULTS>>[\s\S]*?<\/SCAN_RESULTS>>/g, '').trim();
      const outputLines = cleaned.split('\n').filter(l => l.trim()).slice(0, 30);
      outputLines.forEach(line => {
        const type = /✓|PASS|OK|success/i.test(line) ? 'PASS' :
                     /✗|FAIL|ERROR|critical/i.test(line) ? 'FAIL' :
                     /⚠|WARN|warning/i.test(line) ? 'WARN' : 'INFO';
        setConsoleLogs(prev => [...prev, { type, text: line, time: new Date().toLocaleTimeString() }]);
      });
    } catch (error) {
      setConsoleLogs(prev => [...prev, { type: 'FAIL', text: 'Failed to connect to security shell.', time: new Date().toLocaleTimeString() }]);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "Critical": return <Badge className="bg-red-500 text-white border-none font-bold">Critical</Badge>;
      case "High": return <Badge className="bg-orange-500 text-white border-none font-bold">High</Badge>;
      case "Medium": return <Badge className="bg-yellow-500 text-black border-none font-bold">Medium</Badge>;
      case "Low": return <Badge className="bg-blue-500 text-white border-none font-bold">Low</Badge>;
      default: return <Badge className="bg-zinc-400 text-white border-none font-bold">Info</Badge>;
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden">
      <ChatNavbar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectSelect={setSelectedProjectId}
        selectedModel={selectedModel}
        onModelSelect={setSelectedModel}
        isProjectPopoverOpen={isProjectPopoverOpen}
        setIsProjectPopoverOpen={setIsProjectPopoverOpen}
      />

      <div className="flex-1 flex flex-col min-h-0 relative">
        {!selectedProjectId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <Shield className="w-16 h-16 text-zinc-100 mb-6" />
            <h2 className="text-2xl font-black uppercase tracking-tight">Project Required</h2>
            <p className="text-xs text-zinc-400 mt-2 uppercase font-bold tracking-widest">Select a target from the header to begin auditing</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-8 border-b bg-zinc-50/50">
              <TabsList className="h-12 bg-transparent gap-8 p-0">
                <TabsTrigger value="chat" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Security Console</TabsTrigger>
                <TabsTrigger value="results" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Scan Report</TabsTrigger>
                <TabsTrigger value="badge" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Trust Badge</TabsTrigger>
                <TabsTrigger value="console" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Secure Shell</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0 overflow-y-auto relative min-h-0 data-[state=active]:flex">
              <MessageList
                messages={messages}
                currentScreenshot={currentScreenshot}
                browserScanSteps={browserScanSteps}
                chatEndRef={chatEndRef}
              />
              <ChatInput
                input={input}
                setInput={setInput}
                onSend={() => handleSendMessage()}
                onAIRiskScan={handleAIRiskScan}
              />
            </TabsContent>

            <TabsContent value="results" className="flex-1 flex flex-col p-0 m-0 overflow-hidden bg-zinc-50/50 min-h-0 data-[state=active]:flex">
              <ScrollArea className="flex-1">
                <div className="max-w-5xl mx-auto p-12 pb-32">
                  <div className="flex items-center justify-between mb-16">
                    <div className="flex items-center gap-8">
                      <div className="relative w-28 h-28">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle className="text-zinc-200 stroke-current" strokeWidth="6" fill="transparent" r="42" cx="50" cy="50" />
                          <circle className="text-teal-500 stroke-current" strokeWidth="6" strokeLinecap="round" fill="transparent" r="42" cx="50" cy="50" strokeDasharray={`${(score || 0) * 2.639} 263.9`} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-black text-3xl">{score || 0}</div>
                      </div>
                      <div>
                        <h2 className="text-3xl font-black uppercase tracking-tight">Executive Summary</h2>
                        <p className="text-[11px] font-black uppercase text-zinc-400 mt-2 tracking-widest border-l-4 border-teal-500 pl-4">Session: {session.id.slice(0, 12)}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="h-12 rounded-[1.5rem] font-black uppercase text-xs gap-3 px-10 border-zinc-200 shadow-sm" onClick={() => window.print()}>
                      <FileText className="w-4 h-4" />
                      Generate PDF
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {findings.map(f => (
                      <Card key={f.id} className="bg-white border-zinc-100 p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        {f.isAIRisk && (
                          <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1 text-[10px] font-black uppercase tracking-tighter">AI-Origin Risk</div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              {getSeverityBadge(f.severity)}
                              <span className="font-black text-lg tracking-tight">{f.title}</span>
                            </div>
                            <p className="text-sm text-zinc-500 font-medium leading-relaxed max-w-2xl">{f.explanation}</p>
                          </div>
                          <Button
                            className="h-10 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white font-black uppercase text-[10px] tracking-widest px-8 transition-colors"
                            onClick={() => { setActiveTab("chat"); handleSendMessage(`Deploy fix for ${f.title}`); }}
                          >
                            Remediate
                          </Button>
                        </div>
                      </Card>
                    ))}
                    {findings.length === 0 && (
                      <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-zinc-100">
                        <ShieldCheck className="w-12 h-12 text-teal-100 mx-auto mb-4" />
                        <p className="text-zinc-400 font-bold uppercase text-xs tracking-widest mb-6">No vulnerabilities found yet</p>
                        <Button
                          onClick={() => {
                            const project = projects.find(p => p.id === selectedProjectId);
                            setActiveTab("chat");
                            handleSendMessage(
                              `Perform a full security audit of the project "${project?.title}". Analyze all files for vulnerabilities, misconfigurations, hardcoded secrets, and AI-introduced risks. Provide your complete findings in the required <<SCAN_RESULTS>> JSON format at the end.`,
                              `System: Initiating Full Security Audit for "${project?.title}"...`
                            );
                          }}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-black uppercase text-xs tracking-widest px-8 py-3 rounded-xl gap-2"
                        >
                          <Search className="w-4 h-4" />
                          Initiate Security Scan
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="badge" className="flex-1 flex flex-col p-0 m-0 overflow-hidden bg-white min-h-0 data-[state=active]:flex">
              <ScrollArea className="flex-1">
                <div className="max-w-4xl mx-auto p-12 flex flex-col items-center">
                  <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 text-center">Trust Infrastructure</h2>
                  <p className="text-zinc-500 font-medium mb-16 text-center max-w-lg">Communicate your security robustness to your customers with our verified seal.</p>

                  {score === null ? (
                    <div className="text-center py-16 bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-200 mb-16 w-full">
                      <Shield className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                      <p className="text-zinc-400 font-bold uppercase text-xs tracking-widest mb-6">Run a security scan first to generate your badge</p>
                      <Button
                        onClick={() => {
                          const project = projects.find(p => p.id === selectedProjectId);
                          setActiveTab("chat");
                          handleSendMessage(
                            `Perform a full security audit of the project "${project?.title}" and provide findings in the <<SCAN_RESULTS>> JSON format.`,
                            `System: Initiating Security Scan for badge generation...`
                          );
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-black uppercase text-xs tracking-widest px-8 py-3 rounded-xl gap-2"
                      >
                        <Search className="w-4 h-4" />
                        Run Security Scan
                      </Button>
                    </div>
                  ) : (
                    <div className="p-16 bg-[#F9FAF6] rounded-[4rem] border-2 border-dashed border-zinc-200 mb-16 relative">
                      <div className="scale-[1.8]" dangerouslySetInnerHTML={{ __html: badgeCode || generateBadgeFromScore(score) }} />
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-6 py-2 rounded-full border border-zinc-100 shadow-sm">
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Live Visual Preview</span>
                      </div>
                    </div>
                  )}

                  {score !== null && (
                    <div className="w-full space-y-6">
                      {!badgeCode && (
                        <div className="flex justify-center mb-2">
                          <Button
                            onClick={() => setBadgeCode(generateBadgeFromScore(score))}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-black uppercase text-xs tracking-widest px-8 py-3 rounded-xl gap-2"
                          >
                            <Shield className="w-4 h-4" />
                            Generate Trust Badge
                          </Button>
                        </div>
                      )}
                      <div className="bg-zinc-950 rounded-[2.5rem] p-8 relative border-2 border-zinc-900 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">HTML Embed Script</span>
                          <Button variant="ghost" className="text-teal-400 font-bold hover:text-teal-300 hover:bg-white/5" onClick={() => navigator.clipboard.writeText(badgeCode || generateBadgeFromScore(score))}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Code
                          </Button>
                        </div>
                        <code className="text-[12px] font-mono text-teal-200 block break-all whitespace-pre-wrap leading-relaxed">{badgeCode || generateBadgeFromScore(score)}</code>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="console" className="flex-1 flex flex-col p-0 m-0 overflow-hidden bg-zinc-950 min-h-0 data-[state=active]:flex">
              <div className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 p-6 font-mono text-[11px] leading-relaxed">
                  {consoleLogs.map((log, i) => (
                    <div key={i} className="flex gap-4 mb-2">
                      <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                      <span className={cn(
                        "font-black px-2 py-0.5 rounded text-[9px] min-w-[50px] text-center",
                        log.type === 'PASS' ? 'text-emerald-400 bg-emerald-400/10' :
                          log.type === 'FAIL' ? 'text-red-400 bg-red-400/10' :
                            log.type === 'WARN' ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-500 bg-zinc-800'
                      )}>{log.type}</span>
                      <span className="text-zinc-300">{log.text}</span>
                    </div>
                  ))}
                </ScrollArea>
                <div className="p-4 bg-zinc-900 border-t border-zinc-800 shrink-0 flex items-center gap-3">
                  <span className="text-teal-500 font-black text-xs">$</span>
                  <input
                    className="flex-1 bg-transparent border-none text-zinc-100 font-mono text-xs focus:ring-0 p-0"
                    placeholder="Enter terminal command..."
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runConsoleCommand(consoleInput)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
