"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { extractYoutubeId } from "@/lib/youtube";

const BOTTLE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const COMMENT_MAX_LENGTH = 140;
const DEVICE_ID_RE = /^[0-9a-f-]{8,64}$/i;

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

  await db.execute({
    sql: `INSERT INTO devices (device_id, pick_credits, created_at, last_seen_at)
          VALUES (?, 1, ?, ?)
          ON CONFLICT(device_id) DO UPDATE SET
            last_seen_at = excluded.last_seen_at,
            pick_credits = devices.pick_credits + 1`,
    args: [deviceId, now, now],
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
      remaining: number;
    }
  | { ok: false; error: string; remaining?: number };

async function getCredits(deviceId: string): Promise<number> {
  const res = await db.execute({
    sql: "SELECT pick_credits FROM devices WHERE device_id = ?",
    args: [deviceId],
  });
  return Number(res.rows[0]?.pick_credits ?? 0);
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

  // 自分のボトル → 無料
  if (owner === deviceId) {
    return { ok: true, reason: "owner", bottle: detail, cost: 0, remaining: await getCredits(deviceId) };
  }

  // 既にピック済み → 無料で再開封
  const already = await db.execute({
    sql: "SELECT 1 FROM picks WHERE bottle_id = ? AND picker_device_id = ? LIMIT 1",
    args: [bottleId, deviceId],
  });
  if (already.rows.length > 0) {
    return { ok: true, reason: "already", bottle: detail, cost: 0, remaining: await getCredits(deviceId) };
  }

  // 新規ピック → credit 必要
  const credits = await getCredits(deviceId);
  if (credits < 1) {
    return {
      ok: false,
      error: "ボトルを拾うには、まず自分で 1 本流す必要があります。",
      remaining: credits,
    };
  }

  const pickId = crypto.randomUUID();
  const now = Date.now();

  // credit 消費が成立した場合のみ pick を確定させる。
  // CHECK 条件付き UPDATE の rowsAffected を見て手動でコミット/ロールバック。
  const tx = await db.transaction("write");
  try {
    const upd = await tx.execute({
      sql: "UPDATE devices SET pick_credits = pick_credits - 1 WHERE device_id = ? AND pick_credits >= 1",
      args: [deviceId],
    });
    if (upd.rowsAffected !== 1) {
      await tx.rollback();
      return {
        ok: false,
        error: "ボトルを拾うには、まず自分で 1 本流す必要があります。",
        remaining: await getCredits(deviceId),
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
  return { ok: true, reason: "fresh", bottle: detail, cost: 1, remaining: credits - 1 };
}

export async function getDeviceState(deviceId: string): Promise<{ credits: number }> {
  if (!DEVICE_ID_RE.test(deviceId)) return { credits: 0 };
  return { credits: await getCredits(deviceId) };
}
