"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { startOfJstDay } from "@/lib/time";
import { extractYoutubeId } from "@/lib/youtube";

const BOTTLE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const COMMENT_MAX_LENGTH = 140;
const DEVICE_ID_RE = /^[0-9a-f-]{8,64}$/i;

// "use server" ファイルは async function 以外を export できないため、定数は非 export。
// 値を他から参照したい場合は別ファイル（例: src/lib/limits.ts）に移すこと。
const DAILY_BOTTLE_LIMIT = 3;
const PICK_CREDIT_CAP = 3;

export type CreateBottleState = {
  ok: boolean;
  error?: string;
};

export async function createBottle(
  _prev: CreateBottleState,
  formData: FormData,
): Promise<CreateBottleState> {
  const deviceId = String(formData.get("device_id") ?? "").trim();
  const youtubeUrl = String(formData.get("youtube_url") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();

  if (!DEVICE_ID_RE.test(deviceId)) {
    return { ok: false, error: "端末IDが取得できませんでした。ページを再読み込みしてください。" };
  }
  if (!comment) {
    return { ok: false, error: "一言を入力してください。" };
  }
  if (comment.length > COMMENT_MAX_LENGTH) {
    return { ok: false, error: `一言は${COMMENT_MAX_LENGTH}文字以内で入力してください。` };
  }

  const youtubeId = extractYoutubeId(youtubeUrl);
  if (!youtubeId) {
    return { ok: false, error: "YouTube の URL を確認してください。" };
  }

  const now = Date.now();
  const expiresAt = now + BOTTLE_LIFETIME_MS;
  const todayStart = startOfJstDay(now);

  // 1 日（JST）の投稿上限チェック
  const todayCountRes = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM bottles WHERE device_id = ? AND created_at >= ?",
    args: [deviceId, todayStart],
  });
  const todayCount = Number(todayCountRes.rows[0]?.n ?? 0);
  if (todayCount >= DAILY_BOTTLE_LIMIT) {
    return {
      ok: false,
      error: `1 日に流せるのは ${DAILY_BOTTLE_LIMIT} 本までです。明日また流しましょう。`,
    };
  }

  await db.execute({
    sql: `INSERT INTO devices (device_id, pick_credits, created_at, last_seen_at)
          VALUES (?, 1, ?, ?)
          ON CONFLICT(device_id) DO UPDATE SET
            last_seen_at = excluded.last_seen_at,
            pick_credits = MIN(devices.pick_credits + 1, ?)`,
    args: [deviceId, now, now, PICK_CREDIT_CAP],
  });

  const bottleId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO bottles
            (id, youtube_url, youtube_id, comment, device_id, created_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [bottleId, youtubeUrl, youtubeId, comment, deviceId, now, expiresAt],
  });

  revalidatePath("/");
  redirect("/?just_posted=1");
}

export type PickResult =
  | {
      ok: true;
      reason: "owner" | "already" | "fresh";
      bottle: { youtube_id: string; comment: string };
      cost: 0 | 1;
      openableRemaining: number;
    }
  | { ok: false; error: string; openableRemaining?: number };

export type SeaBottleAccess = "owner" | "replay" | "new" | "locked";

export type PickUiState = {
  /** 新規開封（クレジット消費）できる本数 = min(ピック権, 海上の未開封他者ボトル数) */
  openableCount: number;
  pickCredits: number;
  access: Record<string, SeaBottleAccess>;
};

async function getCredits(deviceId: string): Promise<number> {
  const res = await db.execute({
    sql: "SELECT pick_credits FROM devices WHERE device_id = ?",
    args: [deviceId],
  });
  return Number(res.rows[0]?.pick_credits ?? 0);
}

/** 海上で、自分以外・未ピック・有効なボトル数 */
async function countNewOpenableOnSea(deviceId: string): Promise<number> {
  const now = Date.now();
  const res = await db.execute({
    sql: `SELECT COUNT(*) AS cnt
            FROM bottles b
           WHERE b.is_archived = 0
             AND b.status = 'active'
             AND b.expires_at > ?
             AND b.device_id != ?
             AND NOT EXISTS (
               SELECT 1 FROM picks p
                WHERE p.bottle_id = b.id AND p.picker_device_id = ?
             )`,
    args: [now, deviceId, deviceId],
  });
  return Number(res.rows[0]?.cnt ?? 0);
}

async function getOpenableCount(deviceId: string): Promise<number> {
  const pickCredits = await getCredits(deviceId);
  if (pickCredits < 1) return 0;
  const eligibleOnSea = await countNewOpenableOnSea(deviceId);
  return Math.min(pickCredits, eligibleOnSea);
}

export async function getPickUiState(deviceId: string, bottleIds: string[]): Promise<PickUiState> {
  if (!DEVICE_ID_RE.test(deviceId)) {
    return { openableCount: 0, pickCredits: 0, access: {} };
  }

  const pickCredits = await getCredits(deviceId);
  const openableCount = await getOpenableCount(deviceId);
  const access: Record<string, SeaBottleAccess> = {};

  if (bottleIds.length === 0) {
    return { openableCount, pickCredits, access };
  }

  const now = Date.now();
  const placeholders = bottleIds.map(() => "?").join(", ");
  const res = await db.execute({
    sql: `SELECT b.id, b.device_id,
            EXISTS (
              SELECT 1 FROM picks p
               WHERE p.bottle_id = b.id AND p.picker_device_id = ?
            ) AS already_picked
            FROM bottles b
           WHERE b.id IN (${placeholders})
             AND b.is_archived = 0
             AND b.status = 'active'
             AND b.expires_at > ?`,
    args: [deviceId, ...bottleIds, now],
  });

  const rowById = new Map(
    res.rows.map((row) => [
      String(row.id),
      {
        owner: String(row.device_id) === deviceId,
        alreadyPicked: Number(row.already_picked) === 1,
      },
    ]),
  );

  for (const id of bottleIds) {
    const row = rowById.get(id);
    if (!row) {
      access[id] = "locked";
      continue;
    }
    if (row.owner) {
      access[id] = "owner";
    } else if (row.alreadyPicked) {
      access[id] = "replay";
    } else if (openableCount > 0) {
      access[id] = "new";
    } else {
      access[id] = "locked";
    }
  }

  return { openableCount, pickCredits, access };
}

export async function pickBottle(deviceId: string, bottleId: string): Promise<PickResult> {
  if (!DEVICE_ID_RE.test(deviceId)) {
    return { ok: false, error: "端末IDが取得できませんでした。ページを再読み込みしてください。" };
  }

  const bottleRes = await db.execute({
    sql: `SELECT device_id, youtube_id, comment, is_archived, status, expires_at
            FROM bottles WHERE id = ? LIMIT 1`,
    args: [bottleId],
  });
  const row = bottleRes.rows[0];
  if (!row) {
    return { ok: false, error: "このボトルはもう見つかりません。" };
  }

  const owner = String(row.device_id);
  const isArchived = Number(row.is_archived) === 1;
  const isActive = String(row.status) === "active";
  const isExpired = Number(row.expires_at) <= Date.now();
  if (isArchived || !isActive || isExpired) {
    return { ok: false, error: "このボトルはもう海面にありません。" };
  }

  const detail = {
    youtube_id: String(row.youtube_id),
    comment: String(row.comment),
  };

  const openableRemaining = () => getOpenableCount(deviceId);

  // 自分のボトル → 無料
  if (owner === deviceId) {
    return { ok: true, reason: "owner", bottle: detail, cost: 0, openableRemaining: await openableRemaining() };
  }

  // 既にピック済み → 無料で再開封
  const already = await db.execute({
    sql: "SELECT 1 FROM picks WHERE bottle_id = ? AND picker_device_id = ? LIMIT 1",
    args: [bottleId, deviceId],
  });
  if (already.rows.length > 0) {
    return { ok: true, reason: "already", bottle: detail, cost: 0, openableRemaining: await openableRemaining() };
  }

  // 新規開封 → ピック権必須（UI だけでなくサーバーでも拒否）
  const credits = await getCredits(deviceId);
  if (credits < 1) {
    return {
      ok: false,
      error: "新規で開封できるボトルはありません。まず 1 本流して開封権を得てください。",
      openableRemaining: 0,
    };
  }

  const pickId = crypto.randomUUID();
  const now = Date.now();

  // クレジット消費・二重ピック・期限切れを同一トランザクションで検証
  const tx = await db.transaction("write");
  try {
    const live = await tx.execute({
      sql: `SELECT device_id, is_archived, status, expires_at
              FROM bottles WHERE id = ? LIMIT 1`,
      args: [bottleId],
    });
    const liveRow = live.rows[0];
    if (
      !liveRow ||
      String(liveRow.device_id) === deviceId ||
      Number(liveRow.is_archived) === 1 ||
      String(liveRow.status) !== "active" ||
      Number(liveRow.expires_at) <= now
    ) {
      await tx.rollback();
      return { ok: false, error: "このボトルは新規で開封できません。", openableRemaining: await openableRemaining() };
    }

    const dup = await tx.execute({
      sql: "SELECT 1 FROM picks WHERE bottle_id = ? AND picker_device_id = ? LIMIT 1",
      args: [bottleId, deviceId],
    });
    if (dup.rows.length > 0) {
      await tx.rollback();
      return { ok: true, reason: "already", bottle: detail, cost: 0, openableRemaining: await openableRemaining() };
    }

    const upd = await tx.execute({
      sql: "UPDATE devices SET pick_credits = pick_credits - 1 WHERE device_id = ? AND pick_credits >= 1",
      args: [deviceId],
    });
    if (upd.rowsAffected !== 1) {
      await tx.rollback();
      return {
        ok: false,
        error: "新規で開封できるボトルはありません。まず 1 本流して開封権を得てください。",
        openableRemaining: 0,
      };
    }

    await tx.execute({
      sql: "INSERT INTO picks (id, bottle_id, picker_device_id, picked_at) VALUES (?, ?, ?, ?)",
      args: [pickId, bottleId, deviceId, now],
    });
    await tx.execute({
      sql: "UPDATE bottles SET pick_count = pick_count + 1 WHERE id = ?",
      args: [bottleId],
    });
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  revalidatePath("/");
  return { ok: true, reason: "fresh", bottle: detail, cost: 1, openableRemaining: await openableRemaining() };
}

/** @deprecated getPickUiState を利用 */
export async function getDeviceState(deviceId: string): Promise<{ credits: number; openableCount: number }> {
  if (!DEVICE_ID_RE.test(deviceId)) return { credits: 0, openableCount: 0 };
  const pickCredits = await getCredits(deviceId);
  const openableCount = await getOpenableCount(deviceId);
  return { credits: pickCredits, openableCount };
}
