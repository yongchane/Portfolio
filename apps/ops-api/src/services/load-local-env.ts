import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./repo-root";

const ENV_FILES = [
  ".env.local",
  ".env.development.local",
  ".env.development",
  ".env",
  path.join(".vercel", ".env.development.local"),
];

export function loadLocalEnv() {
  for (const file of ENV_FILES) {
    const filePath = path.join(repoRoot(), file);
    if (!existsSync(filePath)) continue;
    applyEnvFile(readFileSync(filePath, "utf8"));
  }
}

function applyEnvFile(contents: string) {
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;

    const equalsIndex = line.indexOf("=");
    let key = line.slice(0, equalsIndex).trim();
    if (key.startsWith("export ")) key = key.slice("export ".length).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = normalizeEnvValue(line.slice(equalsIndex + 1).trim());
  }
}

function normalizeEnvValue(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
