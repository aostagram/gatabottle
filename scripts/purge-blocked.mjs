#!/usr/bin/env node
// 既存の bottles のうち、ブロック対象の歌手/チャンネル（src/lib/blocklist.json）の
// 曲を YouTube oEmbed で判定して削除する。関連する picks / likes も削除する。
//
// 判定ロジックは src/lib/blocklist.ts と同じ（このスクリプトは JS なので同ファイルを
// 直接 import せず、blocklist.json を読んで同じ判定を再現する）。
//
// 使い方:
//   npm run db:purge-blocked                  # まずは dry-run（削除せず対象を表示）
//   npm run db:purge-blocked -- --apply       # 実際に削除する
//   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:purge-blocked -- --apply  # 本番

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@libsql/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// .env.local を読む（無くてもよい）
try {
  const env = readFileSync(resolve(projectRoot, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const [, k, v] = m;
    if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, "");
  }
} catch {
  // noop
}

// ---- ブロック判定（src/lib/blocklist.ts と同じ挙動を再現） ----
const blocklist = JSON.parse(
  readFileSync(resolve(projectRoot, "src/lib/blocklist.json"), "utf8"),
);
const norm = (s) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const BLOCKED_NAMES = blocklist.artistNames.map(norm);
const BLOCKED_CHANNEL_IDS = blocklist.channelIds.map((s) => s.toLowerCase());
const BLOCKED_HANDLES = blocklist.channelHandles.map((s) => s.toLowerCase());

function isBlockedAuthor(author) {
  if (!author) return false;
  const name = author.author_name ? norm(author.author_name) : "";
  if (name && BLOCKED_NAMES.some((b) => b && name.includes(b))) return true;
  const url = author.author_url ?? "";
  const idMatch = url.match(/\/channel\/(UC[\w-]+)/i);
  if (idMatch && BLOCKED_CHANNEL_IDS.includes(idMatch[1].toLowerCase())) return true;
  const handleMatch = url.match(/\/(@[\w.-]+)/);
  if (handleMatch && BLOCKED_HANDLES.includes(handleMatch[1].toLowerCase())) return true;
  return false;
}

async function fetchYoutubeAuthor(youtubeId, timeoutMs = 4000) {
  const target = `https://www.youtube.com/watch?v=${youtubeId}`;
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(oembed, { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json();
    return { author_name: json.author_name ?? null, author_url: json.author_url ?? null };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---- main ----
const apply = process.argv.includes("--apply");
const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

console.log(`→ target DB: ${url}`);
console.log(`→ blocked artistNames: ${JSON.stringify(blocklist.artistNames)}`);
console.log(`→ mode: ${apply ? "APPLY (削除します)" : "dry-run (削除しません)"}\n`);

const all = await client.execute("SELECT id, youtube_id, comment FROM bottles");
console.log(`bottles total = ${all.rows.length}\n`);

const blocked = [];
let unknown = 0;
for (const row of all.rows) {
  const id = String(row.id);
  const youtubeId = String(row.youtube_id);
  const author = await fetchYoutubeAuthor(youtubeId);
  if (author === null) unknown += 1;
  if (isBlockedAuthor(author)) {
    blocked.push({ id, youtubeId, author_name: author?.author_name ?? null, comment: String(row.comment) });
    console.log(`  ✗ BLOCK  ${youtubeId}  by "${author?.author_name ?? "?"}"  「${row.comment}」`);
  }
}

console.log(`\nblocked = ${blocked.length} 本 / oEmbed 取得不能 = ${unknown} 本`);

if (blocked.length === 0) {
  console.log("削除対象はありませんでした。");
  process.exit(0);
}

if (!apply) {
  console.log("\n--apply を付けると実際に削除します（picks / likes も含む）。");
  process.exit(0);
}

let deleted = 0;
for (const b of blocked) {
  const tx = await client.transaction("write");
  try {
    await tx.execute({ sql: "DELETE FROM likes WHERE bottle_id = ?", args: [b.id] });
    await tx.execute({ sql: "DELETE FROM picks WHERE bottle_id = ?", args: [b.id] });
    await tx.execute({ sql: "DELETE FROM bottles WHERE id = ?", args: [b.id] });
    await tx.commit();
    deleted += 1;
    console.log(`  ✓ deleted ${b.youtubeId} (${b.id})`);
  } catch (err) {
    await tx.rollback();
    console.error(`  ! failed ${b.id}:`, err?.message ?? err);
  }
}

console.log(`\ndone. deleted = ${deleted} 本`);
process.exit(0);
