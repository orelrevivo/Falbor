"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSecuritySessionsWithProjects, createSecuritySession } from "@/app/actions/security";
import { Card } from "@/components/ui/card";
import { Shield, Clock, ExternalLink, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HomeTabs } from "@/components/home/home-tabs";

export default function SecurityLandingPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    async function fetchSessions() {
      const data = await getSecuritySessionsWithProjects();
      setSessions(data);
    }
    fetchSessions();
  }, []);

  const handleNewSession = async () => {
    const session = await createSecuritySession("Security Session");
    router.push(`/super-security/${session.id}`);
  };

  const lastSession = sessions[0];
  const lastMessages = lastSession?.messages?.slice(-2) || [];

  return (
    <div
      className="flex flex-col items-center min-h-full p-8 bg-[#FAF9F6] relative"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.75), rgba(255,255,255,0.75)), url('/bg/ChatIDstylebg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="">
        <HomeTabs />
      </div>
      <div className="mt-[-90px]">
        {/* ⭐ BIG FLOATING IMAGE */}
        <img
          src="/SuperSecurityAgent.png"
          className="absolute top-10 left-1/2 -translate-x-1/2 w-[420px] z-20 pointer-events-none select-none"
          alt=""
        />

        <div className="max-w-6xl w-full flex flex-col items-center">

          {/* HEADER TEXT */}
          <div className="text-center mb-6 mt-[160px]">
            <p className="text-[#878782] text-sm max-w-xl mx-auto">
              Audit applications and secure your projects with AI-powered security analysis.
            </p>
          </div>

          {/* MAIN DASHBOARD ROW */}
          <div className="w-full flex gap-5 items-start">

            {/* LEFT — SQUARE */}
            {lastSession ? (
              <Card className="w-[420px] h-[420px] flex-shrink-0 flex flex-col p-8 border-[#E8E9E0] shadow-xs rounded-md bg-white relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-black/60" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold text-[#A1A19A] uppercase tracking-wider">
                      Last Activity
                    </div>
                    <div className="font-bold truncate text-sm">
                      {lastSession.projectTitle || lastSession.title}
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-4 overflow-hidden">
                  {lastMessages.length > 0 ? (
                    lastMessages.map((msg: any, i: number) => (
                      <div
                        key={i}
                        className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[90%] ${msg.role === "user"
                          ? "bg-[#0099ff] text-white self-end rounded-tr-none"
                          : "bg-[#F1F3F5] text-black self-start rounded-tl-none"
                          }`}
                      >
                        {msg.content.length > 150
                          ? msg.content.slice(0, 150) + "..."
                          : msg.content}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 italic text-sm">
                      No messages yet in this session
                    </div>
                  )}
                </div>

                <Button
                  variant="link"
                  className="mt-6 w-full text-xs"
                  onClick={() =>
                    router.push(`/super-security/${lastSession.id}`)
                  }
                >
                  Resume Discussion
                </Button>
              </Card>
            ) : (
              <Card className="w-[420px] h-[420px] flex-shrink-0 flex flex-col items-center justify-center p-8 border-dashed border-2 border-[#E8E9E0] text-[#A1A19A] rounded-[2rem] bg-white/50">
                <Shield className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">
                  No active security session found
                </p>
              </Card>
            )}

            {/* RIGHT — TABLE */}
            <Card className="flex-1 h-[420px] border-[#E8E9E0] rounded-md overflow-hidden shadow-xs bg-white flex flex-col">

              <div className="px-8 pt-6 pb-4 flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#A1A19A]">
                  Projects
                </div>

                <button
                  onClick={handleNewSession}
                  className="flex items-center gap-2 px-4 py-1.5 bg-[#0099ff] text-white rounded-sm font-bold text-xs"
                >
                  <Plus className="w-4 h-4" />
                  New Scan
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-zinc-50/50 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-b-[#E8E9E0]">
                      <TableHead className="font-bold py-4 px-8 text-xs uppercase tracking-wider text-[#A1A19A]">
                        Project Name
                      </TableHead>
                      <TableHead className="font-bold py-4 text-xs uppercase tracking-wider text-[#A1A19A]">
                        Status
                      </TableHead>
                      <TableHead className="font-bold py-4 text-xs uppercase tracking-wider text-[#A1A19A]">
                        Updated
                      </TableHead>
                      <TableHead className="text-right py-4 px-8"></TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {sessions.length > 0 ? (
                      sessions.map((s) => (
                        <TableRow
                          key={s.id}
                          className="cursor-pointer hover:bg-zinc-50 border-b-[#E8E9E0]"
                          onClick={() =>
                            router.push(`/super-security/${s.id}`)
                          }
                        >
                          <TableCell className="py-4 px-8">
                            <div className="font-bold text-black text-sm">
                              {s.projectTitle || s.title}
                            </div>
                            <div className="text-[10px] text-gray-400 font-medium">
                              ID: {s.id.slice(0, 8)}
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <span className="px-2.5 py-1 bg-[#E8F5E9] text-[#2E7D32] text-[10px] font-bold rounded-lg uppercase tracking-tight">
                              Active
                            </span>
                          </TableCell>

                          <TableCell className="py-4 text-[#878782] text-xs font-medium">
                            {new Date(s.updatedAt).toLocaleDateString()}
                          </TableCell>

                          <TableCell className="text-right py-4 px-8">
                            <ExternalLink className="w-4 h-4 text-[#0099ff]" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-40 text-center text-gray-400 font-medium text-sm italic"
                        >
                          No security projects found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}