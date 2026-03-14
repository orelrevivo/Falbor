import { initializeSystemSkills } from "@/app/actions/skills"

async function main() {
  console.log("Initializing system skills...")
  const result = await initializeSystemSkills()
  
  if (result.success) {
    console.log("✅", result.message)
    process.exit(0)
  } else {
    console.error("❌", result.error)
    process.exit(1)
  }
}

main()
