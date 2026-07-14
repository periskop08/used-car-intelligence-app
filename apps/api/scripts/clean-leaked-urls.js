const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = path.join(__dirname, '../scripts');

const LEAKED_URL = "process.env.DATABASE_URL";

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. If it contains the leaked URL, we need to replace/remove it
  if (content.includes(LEAKED_URL)) {
    console.log(`Cleaning leaked URL in: ${path.basename(filePath)}`);
    
    // Check if it's a direct assignment to process.env.DATABASE_URL
    const assignmentRegex = new RegExp(`process\\.env\\.DATABASE_URL\\s*=\\s*["']${LEAKED_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'];?\\s*`, 'g');
    if (assignmentRegex.test(content)) {
      content = content.replace(assignmentRegex, '');
      changed = true;
    }

    // Check if it's inside an object like url: "postgresql://..."
    const objectPropRegex = new RegExp(`url\\s*:\\s*["']${LEAKED_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g');
    if (objectPropRegex.test(content)) {
      content = content.replace(objectPropRegex, 'url: process.env.DATABASE_URL');
      changed = true;
    }

    // Generic string replacement just in case
    if (content.includes(LEAKED_URL)) {
      content = content.replaceAll(LEAKED_URL, 'process.env.DATABASE_URL');
      changed = true;
    }
  }

  // 2. Ensure dotenv is loaded so process.env.DATABASE_URL is defined
  const isTs = filePath.endsWith('.ts');
  const hasDotenv = content.includes('dotenv.config');
  
  if (changed && !hasDotenv) {
    console.log(`Adding dotenv setup to: ${path.basename(filePath)}`);
    if (isTs) {
      const dotenvSetup = `import * as dotenv from 'dotenv';\nimport * as path from 'path';\ndotenv.config({ path: path.join(__dirname, '../.env') });\n\n`;
      content = dotenvSetup + content;
    } else {
      const dotenvSetup = `require('dotenv').config({ path: require('path').join(__dirname, '../.env') });\n\n`;
      content = dotenvSetup + content;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function main() {
  const files = fs.readdirSync(SCRIPTS_DIR);
  for (const file of files) {
    const fullPath = path.join(SCRIPTS_DIR, file);
    if (fs.statSync(fullPath).isFile() && (file.endsWith('.js') || file.endsWith('.ts'))) {
      cleanFile(fullPath);
    }
  }
  console.log("Cleanup completed!");
}

main();
