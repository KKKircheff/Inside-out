import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CUSTOM_AGENTS_DIR = path.join(__dirname, '..', 'src', 'config', 'custom-agents');
const INDEX_FILE = path.join(CUSTOM_AGENTS_DIR, 'index.ts');

// Ensure directory exists
if (!fs.existsSync(CUSTOM_AGENTS_DIR)) {
  fs.mkdirSync(CUSTOM_AGENTS_DIR, { recursive: true });
}

// Check if index.ts exists
if (!fs.existsSync(INDEX_FILE)) {
  console.log('Creating custom-agents/index.ts...');
  const content = `// Custom agents directory - agents here are not version controlled
// This file will be updated dynamically as users create custom agents
// For now, it exports an empty object since there are no custom agents yet

export {};
`;
  fs.writeFileSync(INDEX_FILE, content, 'utf-8');
  console.log('✓ custom-agents/index.ts created');
} else {
  console.log('✓ custom-agents/index.ts already exists');
}
