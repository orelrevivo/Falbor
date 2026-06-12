const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

// Robustly parse the .env file
const envPath = path.join(__dirname, '.env');
console.log("Reading env from:", envPath);
const envContent = fs.readFileSync(envPath, 'utf-8');
let dbUrl = '';
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEON_NEON_DATABASE_URL=')) {
        dbUrl = trimmed.split('NEON_NEON_DATABASE_URL=')[1];
    }
});

if (!dbUrl) {
    console.error("Could not find NEON_NEON_DATABASE_URL in .env");
    process.exit(1);
}

console.log("Connecting to Database...");
const sql = neon(dbUrl);

async function main() {
    try {
        // Query the latest project
        const latestProjects = await sql`
            SELECT id, title, created_at 
            FROM projects 
            ORDER BY created_at DESC 
            LIMIT 1
        `;

        if (latestProjects.length === 0) {
            console.log("No projects found in database.");
            process.exit(0);
        }

        const project = latestProjects[0];
        console.log("\n=================================");
        console.log(`LATEST PROJECT:`);
        console.log(`ID: ${project.id}`);
        console.log(`Title: ${project.title}`);
        console.log(`Created At: ${project.created_at}`);
        console.log("=================================\n");

        // Query files for this project
        const projectFiles = await sql`
            SELECT id, path, language, LENGTH(content) as size 
            FROM files 
            WHERE project_id = ${project.id}
        `;

        console.log(`Found ${projectFiles.length} files in this project:`);
        projectFiles.forEach(f => {
            console.log(`- [${f.language}] ${f.path} (${f.size} bytes)`);
        });

        // Let's inspect the tailwind config and css files specifically
        console.log("\n=================================");
        console.log("THEME & CONFIGURATION DETAILS:");
        console.log("=================================\n");

        // Fetch them individually or with plain string
        const targetFiles = await sql`
            SELECT path, content 
            FROM files 
            WHERE project_id = ${project.id}
              AND (path LIKE '%css' OR path LIKE '%config.ts' OR path LIKE '%config.js' OR path = 'src/App.tsx' OR path = 'src/main.tsx')
        `;

        targetFiles.forEach(f => {
            console.log(`--- File: ${f.path} ---`);
            console.log(f.content);
            console.log(`-------------------------------------\n`);
        });

        process.exit(0);
    } catch (err) {
        console.error("Error executing query:", err);
        process.exit(1);
    }
}

main();
