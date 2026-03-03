import { db } from "../config/db"
import { userCredits } from "../config/schema"
import { sql } from "drizzle-orm"

async function check() {
    try {
        const result = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'user_credits'`)
        console.log("Columns in user_credits:", JSON.stringify(result.rows, null, 2))
    } catch (err) {
        console.error("Error checking columns:", err)
    }
    process.exit(0)
}

check()
