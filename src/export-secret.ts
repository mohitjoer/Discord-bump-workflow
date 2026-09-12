import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storagePath = path.resolve(__dirname, '../storage-state.json');

if (!fs.existsSync(storagePath)) {
  console.error('❌ storage-state.json not found! Please run `npm run login` first.');
  process.exit(1);
}

const content = fs.readFileSync(storagePath, 'utf-8');

console.log('\n======================================================');
console.log('📋 GITHUB ACTIONS SECRET: STORAGE_STATE_JSON');
console.log('======================================================');
console.log('Copy everything between the dashed lines below and add it as a');
console.log('Repository Secret named "STORAGE_STATE_JSON" in your GitHub Repo:');
console.log('(Settings -> Secrets and variables -> Actions -> New repository secret)\n');
console.log('------------------------- START -------------------------');
console.log(content.trim());
console.log('-------------------------- END --------------------------\n');
