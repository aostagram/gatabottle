#!/usr/bin/env node
// 接続中の DB の bottles / picks を全削除し、AI おすすめ 8 曲を seed する。
// 環境変数で TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を指定すれば本番にも流せる。
//
// 使い方:
//   npm run db:seed                                # .env.local の URL を見る（= ローカル）
//   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/seed.mjs  # 本番

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@libsql/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

try {
  const env = readFileSync(resolve(projectRoot, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const [, k, v] = m;
    if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, "");
  }
} catch {
  // .env.local がなくてもよい
}

const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const SEED_DEVICE = "a1a1a1a1-7eed-4eed-aeed-000000000001";
const now = Date.now();
const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 日

const BOTTLES = [
  { id: "seed-lemon",          youtube_id: "SX_ViT4Ra7k", comment: "夕方に聴くといいよ" },
  { id: "seed-idol",           youtube_id: "ZRtdQ81jPUQ", comment: "テンション上げたい時に" },
  { id: "seed-dynamite",       youtube_id: "gdZLi9oWNZg", comment: "みんなで踊りたくなる" },
  { id: "seed-hypeboy",        youtube_id: "Os_heh8vPfs", comment: "夏のドライブBGM" },
  { id: "seed-blindinglights", youtube_id: "4NRXx6U8ABQ", comment: "夜の運転に" },
  { id: "seed-driverslicense", youtube_id: "ZmDBbnmKpqQ", comment: "ちょっと泣きたい時に" },
  { id: "seed-lovely",         youtube_id: "V1Pl8CzNzCw", comment: "夜の海辺で1人で聴いてほしい" },
  { id: "seed-heatwaves",      youtube_id: "mRD0-GxqHVo", comment: "夏の終わりに沁みる" },
];

const client = createClient({ url, authToken });

console.log(`→ seeding: ${url}`);

await client.execute("DELETE FROM picks");
console.log("  cleared picks");

await client.execute("DELETE FROM bottles");
console.log("  cleared bottles");

await client.execute({
  sql: `INSERT INTO devices(device_id, pick_credits, created_at, last_seen_at)
        VALUES (?, 0, ?, ?)
        ON CONFLICT(device_id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
  args: [SEED_DEVICE, now, now],
});
console.log("  AI seed device ready");

for (const b of BOTTLES) {
  await client.execute({
    sql: `INSERT INTO bottles(id, youtube_url, youtube_id, comment, device_id, created_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      b.id,
      `https://youtu.be/${b.youtube_id}`,
      b.youtube_id,
      b.comment,
      SEED_DEVICE,
      now,
      expiresAt,
    ],
  });
  console.log(`  ✓ ${b.id} (${b.youtube_id})`);
}

const cnt = await client.execute("SELECT COUNT(*) AS n FROM bottles");
console.log(`done. bottles count = ${cnt.rows[0].n}`);
process.exit(0);
