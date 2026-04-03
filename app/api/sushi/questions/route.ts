import { auth } from "@clerk/nextjs/server";
import { db } from "@/config/db";
import { projects, files as filesTable } from "@/config/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { projectId } = await req.json();

  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return new Response("Project not found", { status: 404 });

    const files = await db.select().from(filesTable).where(eq(filesTable.projectId, projectId));
    const fileStructure = files.map((f) => f.path).join("\n");

    const response = await openrouter.chat.completions.create({
      model: "google/gemini-3.1-flash-lite-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert social media strategist.
Analyze the following project structure and title.
Generate 3 strategic questions to help the user define their social media promotion plan.
Each question should have 3-4 multi-choice options with a title and a subtitle.

Output MUST be a JSON array of 3 questions:
[
  {
    "id": 1,
    "question": "...",
    "answer": "",
    "options": [
      { "title": "Option Title", "subtitle": "Option Subtitle" },
      ...
    ]
  }
]`,
        },
        {
          role: "user",
          content: `Project Title: ${project.title}\nProject Description: ${project.description || "N/A"}\nFiles:\n${fileStructure}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "[]";
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed.questions || parsed);
  } catch (error) {
    console.error("[Sushi/Questions] Error:", error);
    return NextResponse.json({ error: "Failed to load strategy questions" }, { status: 500 });
  }
}
