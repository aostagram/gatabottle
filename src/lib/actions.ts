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
