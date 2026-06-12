const fs = require('fs');

const logPath = 'C:/Users/orelr/.gemini/antigravity/brain/be01ab14-641a-4e6c-9069-240fd49cb425/.system_generated/logs/overview.txt';
const lines = fs.readFileSync(logPath, 'utf8').split('\n');

function normalize(str) {
    if (str.startsWith('"') && str.endsWith('"')) {
        str = str.substring(1, str.length - 1);
        str = str.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return str.replace(/\r\n/g, '\n');
}

for (let line of lines) {
    if (!line.trim()) continue;
    try {
        const entry = JSON.parse(line);
        if (entry.step_index >= 2000) break; 

        if (entry.tool_calls) {
            for (let call of entry.tool_calls) {
                if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
                    const args = call.args;
                    let targetFile = args.TargetFile;
                    if (targetFile.startsWith('"')) {
                        targetFile = targetFile.substring(1, targetFile.length - 1).replace(/\\\\/g, '\\');
                    }
                    
                    if (!fs.existsSync(targetFile)) {
                        continue;
                    }
                    
                    let content = fs.readFileSync(targetFile, 'utf8').replace(/\r\n/g, '\n');

                    if (call.name === 'replace_file_content') {
                        let target = normalize(args.TargetContent);
                        let replacement = normalize(args.ReplacementContent);

                        if (content.includes(target)) {
                            content = content.replace(target, replacement);
                            fs.writeFileSync(targetFile, content, 'utf8');
                            console.log(`Successfully applied step ${entry.step_index} to ${targetFile}`);
                        } else {
                            console.error(`Failed to find target in ${targetFile} at step ${entry.step_index}`);
                        }
                    } else if (call.name === 'multi_replace_file_content') {
                        let chunks = [];
                        try { chunks = JSON.parse(args.ReplacementChunks); } catch(e) { chunks = args.ReplacementChunks; }
                        if (typeof chunks === 'string') chunks = JSON.parse(chunks);

                        for (let chunk of chunks) {
                            let target = normalize(chunk.TargetContent);
                            let replacement = normalize(chunk.ReplacementContent);
                            if (content.includes(target)) {
                                content = content.replace(target, replacement);
                                fs.writeFileSync(targetFile, content, 'utf8');
                                console.log(`Successfully applied chunk at step ${entry.step_index} to ${targetFile}`);
                            } else {
                                console.error(`Failed to find chunk target in ${targetFile} at step ${entry.step_index}`);
                            }
                        }
                    }
                }
            }
        }
    } catch(e) {
    }
}
console.log("Done!");
