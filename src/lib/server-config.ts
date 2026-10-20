import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

let fileSettings: Record<string, string> | undefined;

export function readServerSetting(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (!fileSettings) {
    const settings: Record<string, string> = {};
    for (const filename of ['.env', '../ReadWise/.env']) {
      const resolved = path.resolve(process.cwd(), filename);
      if (!fs.existsSync(resolved)) continue;
      const parsed = parseEnv(fs.readFileSync(resolved, 'utf8'));
      for (const [key, setting] of Object.entries(parsed)) {
        if (!settings[key] && setting?.trim()) settings[key] = setting.trim();
      }
    }
    fileSettings = settings;
  }
  return fileSettings[name];
}
