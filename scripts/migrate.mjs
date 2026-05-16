#!/usr/bin/env node
// スキーマ apply。`npm run db:migrate` から呼ばれる。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@libsql/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// .env.local の最低限のローダー（dotenv を依存に入れない）
try {
  const env = readFileSync(resolve(projectRoot, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const [, k, v] = m;
    if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, "");
  }
} catch {
  // 無くてもよい
}

const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const sql = readFileSync(resolve(projectRoot, "src/lib/schema.sql"), "utf8");
const stripComments = (s) =>
  s
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
const statements = sql
  .split(";")
  .map(stripComments)
  .filter((s) => s.length > 0);

const client = createClient({ url, authToken });

console.log(`→ migrating: ${url}`);
for (const stmt of statements) {
  await client.execute(stmt);
  const head = stmt.split("\n")[0].slice(0, 80);
  console.log(`  ok: ${head}`);
}
console.log("done.");
process.exit(0);
