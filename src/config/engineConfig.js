import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '../../config.json');

export function loadEngineConfig() {
  const rawConfig = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(rawConfig);
}
