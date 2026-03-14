"use server"

import { db } from "@/config/db"
import { skills, userSkills, Skill, UserSkill } from "@/config/schema"
import { eq, and, desc } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

// Get all available skills (system-wide)
export async function getAllSkills(): Promise<Skill[]> {
  try {
    const allSkills = await db
      .select()
      .from(skills)
      .where(eq(skills.isActive, true))
      .orderBy(desc(skills.createdAt))
    
    return allSkills
  } catch (error) {
    console.error("[Skills] Failed to fetch all skills:", error)
    return []
  }
}

// Get user's enabled skills with full skill details
export async function getUserSkills(): Promise<(UserSkill & { skill: Skill })[]> {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  try {
    const userSkillsWithDetails = await db
      .select({
        userSkill: userSkills,
        skill: skills,
      })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(
        and(
          eq(userSkills.userId, userId),
          eq(userSkills.isEnabled, true),
          eq(skills.isActive, true)
        )
      )
      .orderBy(desc(userSkills.enabledAt))

    return userSkillsWithDetails.map((row) => ({
      ...row.userSkill,
      skill: row.skill,
    }))
  } catch (error) {
    console.error("[Skills] Failed to fetch user skills:", error)
    return []
  }
}

// Enable a skill for the user
export async function enableSkill(skillId: string, customConfig?: Record<string, any>) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  try {
    // Check if skill exists and is active
    const [skill] = await db
      .select()
      .from(skills)
      .where(and(eq(skills.id, skillId), eq(skills.isActive, true)))

    if (!skill) {
      return { success: false, error: "Skill not found or inactive" }
    }

    // Check if user already has this skill enabled
    const [existing] = await db
      .select()
      .from(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.skillId, skillId)))

    if (existing) {
      // Update existing record to enable it
      await db
        .update(userSkills)
        .set({
          isEnabled: true,
          customConfig: customConfig || existing.customConfig,
          updatedAt: new Date(),
        })
        .where(eq(userSkills.id, existing.id))
    } else {
      // Create new user skill record
      await db.insert(userSkills).values({
        userId,
        skillId,
        isEnabled: true,
        customConfig: customConfig || null,
        enabledAt: new Date(),
      })
    }

    revalidatePath("/settings/skills")
    return { success: true }
  } catch (error) {
    console.error("[Skills] Failed to enable skill:", error)
    return { success: false, error: "Failed to enable skill" }
  }
}

// Disable a skill for the user
export async function disableSkill(userSkillId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  try {
    const [userSkill] = await db
      .select()
      .from(userSkills)
      .where(and(eq(userSkills.id, userSkillId), eq(userSkills.userId, userId)))

    if (!userSkill) {
      return { success: false, error: "Skill not found" }
    }

    await db
      .update(userSkills)
      .set({
        isEnabled: false,
        updatedAt: new Date(),
      })
      .where(eq(userSkills.id, userSkillId))

    revalidatePath("/settings/skills")
    return { success: true }
  } catch (error) {
    console.error("[Skills] Failed to disable skill:", error)
    return { success: false, error: "Failed to disable skill" }
  }
}

// Get skills that the user hasn't enabled yet
export async function getAvailableSkillsForUser(): Promise<Skill[]> {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  try {
    // Get all active skills
    const allActiveSkills = await db
      .select()
      .from(skills)
      .where(eq(skills.isActive, true))

    // Get user's enabled skill IDs
    const userEnabledSkills = await db
      .select({ skillId: userSkills.skillId })
      .from(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.isEnabled, true)))

    const enabledSkillIds = new Set(userEnabledSkills.map((s) => s.skillId))

    // Filter out already enabled skills
    const availableSkills = allActiveSkills.filter(
      (skill) => !enabledSkillIds.has(skill.id)
    )

    return availableSkills
  } catch (error) {
    console.error("[Skills] Failed to fetch available skills:", error)
    return []
  }
}

// Initialize default system skills (should be called once during setup)
export async function initializeSystemSkills() {
  const defaultSkills = [
    {
      slug: "skill-creator",
      name: "Skill Creator",
      description: "Guide for creating or updating skills that extend the platform via specialized knowledge, workflows, or tool integrations.",
      icon: "Wand2",
      category: "system",
      instructions: `When the user wants to create a new skill or modify an existing one:
1. Analyze their requirements and determine the skill's purpose
2. Guide them through defining:
   - Skill name and slug (URL-friendly identifier)
   - Description and icon
   - Category (content, analysis, productivity, etc.)
   - Detailed instructions for how the AI should use this skill
   - Any required model configuration or API endpoints
3. Help them write clear, actionable instructions that the AI can follow
4. If they want to connect to an external API or model (like Nano Banana via Jamili), help configure:
   - API endpoint URL
   - Required API keys or authentication
   - Request/response format
   - Error handling approach
5. Save the skill configuration to the database
6. Test the skill with a sample request to ensure it works`,
    },
    {
      slug: "github-gem-seeker",
      name: "GitHub Gem Seeker",
      description: "Search GitHub for battle-tested solutions instead of reinventing the wheel.",
      icon: "Github",
      category: "development",
      instructions: `When the user needs to find existing solutions, libraries, or code examples:
1. Use the GitHub API to search repositories based on their requirements
2. Analyze search results for:
   - Repository popularity (stars, forks)
   - Recent activity (last update, issues)
   - Code quality indicators
   - License compatibility
3. Provide recommendations with:
   - Repository links
   - Key features and benefits
   - Installation/usage examples
   - Potential trade-offs
4. If appropriate, help integrate the solution into their project`,
    },
    {
      slug: "internet-skill-finder",
      name: "Internet Skill Finder",
      description: "Search and recommend agent skills from verified GitHub repositories.",
      icon: "Search",
      category: "system",
      instructions: `When the user wants to discover new skills or capabilities:
1. Search GitHub and other sources for relevant skill repositories
2. Filter and verify skills based on:
   - Repository quality and maintenance
   - Documentation completeness
   - Community adoption
   - Security considerations
3. Present findings with:
   - Skill descriptions
   - Installation instructions
   - Usage examples
   - Compatibility information
4. Help the user install and configure discovered skills`,
    },
    {
      slug: "similarweb-analytics",
      name: "SimilarWeb Analytics",
      description: "Analyze websites and domains using SimilarWeb traffic data.",
      icon: "BarChart3",
      category: "analysis",
      instructions: `When the user wants to analyze a website or domain:
1. Use the SimilarWeb API to fetch traffic and engagement data
2. Retrieve metrics including:
   - Monthly visits and unique visitors
   - Traffic sources (direct, search, social, referral)
   - Geographic distribution
   - Engagement metrics (time on site, pages per visit, bounce rate)
   - Competitor analysis
3. Present insights in a clear, visual format
4. Provide recommendations based on the data
5. If the user wants to compare multiple sites, perform comparative analysis`,
      modelConfig: {
        modelName: "similarweb-api",
        apiEndpoint: "https://api.similarweb.com/v1",
        apiKeyEnvVar: "SIMILARWEB_API_KEY",
      },
    },
    {
      slug: "stock-analysis",
      name: "Stock Analysis",
      description: "Analyze stocks and companies using financial market data.",
      icon: "TrendingUp",
      category: "analysis",
      instructions: `When the user wants to analyze stocks or financial data:
1. Use financial market APIs to fetch:
   - Current stock prices and historical data
   - Company fundamentals (P/E, EPS, market cap, etc.)
   - News and analyst ratings
   - Technical indicators
2. Perform analysis including:
   - Trend analysis
   - Risk assessment
   - Comparative analysis with peers
   - Price target estimates
3. Present findings with:
   - Clear visualizations
   - Key metrics summary
   - Investment considerations
   - Risk warnings (always include disclaimer)
4. Never provide definitive investment advice - always include appropriate disclaimers`,
      modelConfig: {
        modelName: "financial-api",
        apiEndpoint: "https://api.polygon.io/v2",
        apiKeyEnvVar: "POLYGON_API_KEY",
      },
    },
    {
      slug: "excel-generator",
      name: "Excel Generator",
      description: "Professional Excel spreadsheet creation for organizing and analyzing data.",
      icon: "FileSpreadsheet",
      category: "productivity",
      instructions: `When the user needs to create spreadsheets or organize data:
1. Analyze the data structure and requirements
2. Generate professional Excel files with:
   - Proper formatting and styling
   - Formulas and calculations where appropriate
   - Data validation
   - Charts and visualizations if needed
   - Multiple sheets for complex datasets
3. Use libraries like xlsx or exceljs to create the file
4. Provide download link and usage instructions
5. Offer to create templates for recurring use cases

For simple tables, create formatted HTML tables first. For complex analysis, generate actual .xlsx files.`,
    },
    {
      slug: "video-generator",
      name: "Video Generator",
      description: "Professional AI video production workflow for generating video content.",
      icon: "Video",
      category: "content",
      instructions: `When the user wants to create videos:
1. Determine the video requirements:
   - Purpose and content type
   - Target length and format
   - Style preferences
   - Any specific scenes or elements
2. Use the Nano Banana model via Jamili API to generate video content
3. Process workflow:
   - Send generation request to API with detailed prompts
   - Monitor generation progress
   - Retrieve final video when complete
   - Provide download/streaming link
4. Offer options for:
   - Different video styles
   - Background music
   - Voiceover integration
   - Editing and refinement
5. Always confirm video specifications before generation to avoid unnecessary API calls`,
      modelConfig: {
        modelName: "nano-banana",
        apiEndpoint: "https://api.jamili.ai/v1/video/generate",
        apiKeyEnvVar: "JAMILI_API_KEY",
        additionalParams: {
          model: "nano-banana-v1",
          resolution: "1080p",
          duration: "30s",
        },
      },
    },
    {
      slug: "gws-best-practices",
      name: "GWS Best Practices",
      description: "Best practices for using the Google Workspace CLI services like Drive, Docs, Sheets and Slides.",
      icon: "Cloud",
      category: "productivity",
      instructions: `When the user wants to work with Google Workspace services:
1. Guide them through Google Workspace CLI (GWS) usage for:
   - Google Drive: File management, sharing, organization
   - Google Docs: Document creation, formatting, collaboration
   - Google Sheets: Data management, formulas, automation
   - Google Slides: Presentation creation, design, sharing
2. Provide best practices for:
   - Authentication and security
   - File organization and naming conventions
   - Collaboration workflows
   - Automation with Apps Script
3. Help troubleshoot common issues
4. Offer templates and shortcuts for common tasks
5. Ensure they understand sharing permissions and security implications`,
    },
  ]

  try {
    for (const skill of defaultSkills) {
      // Check if skill already exists
      const [existing] = await db
        .select()
        .from(skills)
        .where(eq(skills.slug, skill.slug))

      if (!existing) {
        await db.insert(skills).values({
          ...skill,
          isSystem: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        console.log(`[Skills] Created system skill: ${skill.name}`)
      }
    }
    return { success: true, message: "System skills initialized" }
  } catch (error) {
    console.error("[Skills] Failed to initialize system skills:", error)
    return { success: false, error: "Failed to initialize skills" }
  }
}

// Get skill by slug
export async function getSkillBySlug(slug: string): Promise<Skill | null> {
  try {
    const [skill] = await db
      .select()
      .from(skills)
      .where(and(eq(skills.slug, slug), eq(skills.isActive, true)))
    
    return skill || null
  } catch (error) {
    console.error("[Skills] Failed to fetch skill by slug:", error)
    return null
  }
}

// Get user's enabled skills for AI context (used in chat)
export async function getUserSkillsForAIContext(userId: string): Promise<Skill[]> {
  try {
    const enabledSkills = await db
      .select({
        skill: skills,
      })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(
        and(
          eq(userSkills.userId, userId),
          eq(userSkills.isEnabled, true),
          eq(skills.isActive, true)
        )
      )

    return enabledSkills.map((row) => row.skill)
  } catch (error) {
    console.error("[Skills] Failed to fetch skills for AI context:", error)
    return []
  }
}

// Create a custom skill
export async function createCustomSkill(data: {
  name: string
  description: string
  instructions: string
  icon: string
  category: string
  modelConfig?: any
}) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  try {
    // Generate slug from name
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Check if slug already exists
    const [existing] = await db
      .select()
      .from(skills)
      .where(eq(skills.slug, slug))

    if (existing) {
      return { success: false, error: "A skill with this name already exists" }
    }

    // Create the skill
    const [newSkill] = await db.insert(skills).values({
      slug,
      name: data.name,
      description: data.description,
      instructions: data.instructions,
      icon: data.icon,
      category: data.category,
      modelConfig: data.modelConfig || null,
      isSystem: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning()

    // Automatically enable for the creator
    await db.insert(userSkills).values({
      userId,
      skillId: newSkill.id,
      isEnabled: true,
      customConfig: null,
      enabledAt: new Date(),
    })

    revalidatePath("/settings/skills")
    return { success: true, skill: newSkill }
  } catch (error) {
    console.error("[Skills] Failed to create custom skill:", error)
    return { success: false, error: "Failed to create skill" }
  }
}
