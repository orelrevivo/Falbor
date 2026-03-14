"use client";

import { SecurityShell } from "./chat/SecurityShell";

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

export function SecurityView({ session, projects }: { session: SecuritySession, projects: Project[] }) {
  return <SecurityShell session={session} projects={projects} />;
}
