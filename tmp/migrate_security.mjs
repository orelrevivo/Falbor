import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();

const sql = neon(process.env.NEON_NEON_DATABASE_URL);

async function run() {
  console.log("Running migration...");
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS security_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        messages JSONB NOT NULL DEFAULT '[]'::jsonb,
        scan_results JSONB,
        selected_model TEXT NOT NULL DEFAULT 'glm-4.7-flash',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
