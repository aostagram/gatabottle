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
// 3 本目を流すと解放される「海探索モード」で、その日に追加で開封できる本数。
const EXPLORE_QUOTA = 5;

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

  // 今日の何本目か（1〜3）。3 本目だけ挙動が変わる。
  const postNumber = todayCount + 1;
  const opensSea = postNumber >= DAILY_BOTTLE_LIMIT; // === 3 本目

  // device 行を用意（last_seen 更新）。クレジット/探索枠は本数に応じて別途更新する。
  await db.execute({
    sql: `INSERT INTO devices (device_id, pick_credits, created_at, last_seen_at)
          VALUES (?, 0, ?, ?)
          ON CONFLICT(device_id) DO UPDATE SET
            last_seen_at = excluded.last_seen_at`,
    args: [deviceId, now, now],
  });

  if (opensSea) {
    // 3 本目 → 通常の開封権は付与せず、当日限定の「海探索モード」を解放する。
    await db.execute({
      sql: "UPDATE devices SET explore_unlocked_day = ?, explore_used = 0 WHERE device_id = ?",
      args: [todayStart, deviceId],
    });
  } else {
    // 1・2 本目 → これまで通り開封権を 1 つ付与（上限あり）。
    await db.execute({
      sql: "UPDATE devices SET pick_credits = MIN(pick_credits + 1, ?) WHERE device_id = ?",
      args: [PICK_CREDIT_CAP, deviceId],
    });
  }

  const bottleId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO bottles
            (id, youtube_url, youtube_id, comment, device_id, created_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [bottleId, youtubeUrl, youtubeId, comment, deviceId, now, expiresAt],
  });

  revalidatePath("/");
  redirect(opensSea ? "/?sea_opened=1" : "/?just_posted=1");
}

export type PickResult =
  | {
      ok: true;
      reason: "owner" | "already" | "fresh";
      bottle: { id: string; youtube_id: string; comment: string };
      cost: 0 | 1;
      openableRemaining: number;
      liked: boolean;
      likeCount: number;
    }
  | { ok: false; error: string; openableRemaining?: number };

export type SeaBottleAccess = "owner" | "replay" | "new" | "locked";

export type ToggleLikeResult =
  | { ok: true; liked: boolean; likeCount: number }
  | { ok: false; error: string };

export type PickUiState = {
  /**
   * 開封可能本数 = 残ピック権 + 残探索枠。
   * 「他人のボトル」を開けるとき消費される（自分のボトルは無料なので含まない）。
   * - 新規（未開封）のボトル: 探索枠 → ピック権 の順に消費。
   * - 再開封のボトル: ピック権のみ消費（探索の対象外）。
   */
  openableCount: number;
  /** 永続クレジット（1・2 本目で増える）。再開封はこれだけを使う。 */
  pickCredits: number;
  /** 今日 3 本目を流して海探索モードが有効か。 */
  exploreUnlocked: boolean;
  /** 今日まだ残っている探索枠（最大 5、翌日 0:00 にリセット）。 */
  exploreRemaining: number;
  /** 実際に今日探索できる本数 = min(残探索枠, 未開封ボトル数)。UI の「本日探索可能：◯本」。 */
  exploreVisibleCount: number;
  access: Record<string, SeaBottleAccess>;
};

async function getCredits(deviceId: string): Promise<number> {
  const res = await db.execute({
    sql: "SELECT pick_credits FROM devices WHERE device_id = ?",
    args: [deviceId],
  });
  return Number(res.rows[0]?.pick_credits ?? 0);
}

type DeviceOpenState = {
  pickCredits: number;
  exploreUnlocked: boolean;
  exploreRemaining: number;
};

/**
 * device の開封リソースをまとめて取得する。
 * 探索枠は「解放日が今日 0:00(JST) と一致するとき」だけ有効。
 * 日付が変われば自動的に exploreRemaining = 0 となり、翌日 0:00 リセットを実現する。
 */
async function getDeviceOpenState(
  deviceId: string,
  now: number = Date.now(),
): Promise<DeviceOpenState> {
  const res = await db.execute({
    sql: "SELECT pick_credits, explore_unlocked_day, explore_used FROM devices WHERE device_id = ?",
    args: [deviceId],
  });
  const row = res.rows[0];
  const pickCredits = Number(row?.pick_credits ?? 0);
  const unlockedDay = Number(row?.explore_unlocked_day ?? 0);
  const used = Number(row?.explore_used ?? 0);
  const exploreUnlocked = unlockedDay !== 0 && unlockedDay === startOfJstDay(now);
  const exploreRemaining = exploreUnlocked ? Math.max(0, EXPLORE_QUOTA - used) : 0;
  return { pickCredits, exploreUnlocked, exploreRemaining };
}

/** 「開封可能本数」= 残ピック権 + 残探索枠。再開封でも消費されるので海上カウントには依存しない。 */
async function getOpenableCount(deviceId: string): Promise<number> {
  const s = await getDeviceOpenState(deviceId);
  return s.pickCredits + s.exploreRemaining;
}

/**
 * この端末がまだ開封していない、開封対象になり得るボトルの本数。
 * 自分のボトル・既開封・期限切れ/アーカイブは除外する（探索モードの表示本数に使う）。
 */
async function countAvailableUnopened(deviceId: string, now: number): Promise<number> {
  const res = await db.execute({
    sql: `SELECT COUNT(*) AS n
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
  return Number(res.rows[0]?.n ?? 0);
}

export async function getPickUiState(deviceId: string, bottleIds: string[]): Promise<PickUiState> {
  if (!DEVICE_ID_RE.test(deviceId)) {
    return {
      openableCount: 0,
      pickCredits: 0,
      exploreUnlocked: false,
      exploreRemaining: 0,
      exploreVisibleCount: 0,
      access: {},
    };
  }

  const now = Date.now();
  const { pickCredits, exploreUnlocked, exploreRemaining } = await getDeviceOpenState(deviceId, now);
  const availableUnopened = await countAvailableUnopened(deviceId, now);
  const exploreVisibleCount = Math.min(exploreRemaining, availableUnopened);
  const openableCount = pickCredits + exploreRemaining;
  const access: Record<string, SeaBottleAccess> = {};

  if (bottleIds.length === 0) {
    return {
      openableCount,
      pickCredits,
      exploreUnlocked,
      exploreRemaining,
      exploreVisibleCount,
      access,
    };
  }

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
      // 自分のボトルは常に無料で開ける
      access[id] = "owner";
    } else if (row.alreadyPicked) {
      // 再開封はピック権のみで開ける（探索枠は未開封ボトル専用）。
      access[id] = pickCredits > 0 ? "replay" : "locked";
    } else {
      // 新規（未開封）は ピック権 or 探索枠 のどちらかがあれば開ける。
      access[id] = pickCredits + exploreRemaining > 0 ? "new" : "locked";
    }
  }

  return {
    openableCount,
    pickCredits,
    exploreUnlocked,
    exploreRemaining,
    exploreVisibleCount,
    access,
  };
}

export async function pickBottle(deviceId: string, bottleId: string): Promise<PickResult> {
  if (!DEVICE_ID_RE.test(deviceId)) {
    return { ok: false, error: "端末IDが取得できませんでした。ページを再読み込みしてください。" };
  }

  const bottleRes = await db.execute({
    sql: `SELECT device_id, youtube_id, comment, is_archived, status, expires_at, like_count
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
    id: bottleId,
    youtube_id: String(row.youtube_id),
    comment: String(row.comment),
  };

  const openableRemaining = () => getOpenableCount(deviceId);

  // いいね状態の取得（自分のボトルでは liked は常に false 扱い）
  async function getLikeState(): Promise<{ liked: boolean; likeCount: number }> {
    const likedRes = await db.execute({
      sql: "SELECT 1 FROM likes WHERE bottle_id = ? AND device_id = ? LIMIT 1",
      args: [bottleId, deviceId],
    });
    return {
      liked: likedRes.rows.length > 0,
      likeCount: Number(row.like_count ?? 0),
    };
  }

  // 自分のボトル → 無料
  if (owner === deviceId) {
    return {
      ok: true,
      reason: "owner",
      bottle: detail,
      cost: 0,
      openableRemaining: await openableRemaining(),
      liked: false,
      likeCount: Number(row.like_count ?? 0),
    };
  }

  const now = Date.now();
  const todayStart = startOfJstDay(now);

  // 既ピック判定（reason 用 + 新規ピック時のみ pick_count をインクリメント）。
  // 再開封は「ピック権」のみで開ける（探索枠は未開封ボトル専用）。
  // 新規は「探索枠 → ピック権」の順に消費する。
  const alreadyRes = await db.execute({
    sql: "SELECT 1 FROM picks WHERE bottle_id = ? AND picker_device_id = ? LIMIT 1",
    args: [bottleId, deviceId],
  });
  const isReplay = alreadyRes.rows.length > 0;

  // 事前チェック（最終的にはトランザクション内で再検証）
  const state = await getDeviceOpenState(deviceId, now);
  if (isReplay) {
    if (state.pickCredits < 1) {
      return {
        ok: false,
        error: "再開封できる権利がありません。ボトルを流して開封権を増やしましょう。",
        openableRemaining: state.pickCredits + state.exploreRemaining,
      };
    }
  } else if (state.pickCredits < 1 && state.exploreRemaining < 1) {
    return {
      ok: false,
      error: "開封できるボトルはありません。まず 1 本流して開封権を得てください。",
      openableRemaining: 0,
    };
  }

  // 消費 + (新規なら) picks INSERT + pick_count +1 を同一トランザクションで
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
      return { ok: false, error: "このボトルはもう開封できません。", openableRemaining: await openableRemaining() };
    }

    // 1 件分の開封リソースを消費する。新規のみ探索枠を先に使う。
    let consumed = false;
    if (!isReplay) {
      // 探索枠（今日解放ぶん・残あり）を優先消費。
      const exploreUpd = await tx.execute({
        sql: `UPDATE devices SET explore_used = explore_used + 1
               WHERE device_id = ? AND explore_unlocked_day = ? AND explore_used < ?`,
        args: [deviceId, todayStart, EXPLORE_QUOTA],
      });
      consumed = exploreUpd.rowsAffected === 1;
    }
    if (!consumed) {
      // 探索枠が無い / 再開封 → ピック権を消費。
      const creditUpd = await tx.execute({
        sql: "UPDATE devices SET pick_credits = pick_credits - 1 WHERE device_id = ? AND pick_credits >= 1",
        args: [deviceId],
      });
      consumed = creditUpd.rowsAffected === 1;
    }
    if (!consumed) {
      await tx.rollback();
      return {
        ok: false,
        error: "開封できるボトルはありません。まず 1 本流して開封権を得てください。",
        openableRemaining: 0,
      };
    }

    if (!isReplay) {
      const pickId = crypto.randomUUID();
      await tx.execute({
        sql: "INSERT INTO picks (id, bottle_id, picker_device_id, picked_at) VALUES (?, ?, ?, ?)",
        args: [pickId, bottleId, deviceId, now],
      });
      await tx.execute({
        sql: "UPDATE bottles SET pick_count = pick_count + 1 WHERE id = ?",
        args: [bottleId],
      });
    }

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  revalidatePath("/");
  const likeState = await getLikeState();
  return {
    ok: true,
    reason: isReplay ? "already" : "fresh",
    bottle: detail,
    cost: 1,
    openableRemaining: await openableRemaining(),
    liked: likeState.liked,
    likeCount: likeState.likeCount,
  };
}

export async function toggleLike(deviceId: string, bottleId: string): Promise<ToggleLikeResult> {
  if (!DEVICE_ID_RE.test(deviceId)) {
    return { ok: false, error: "端末IDが取得できませんでした。ページを再読み込みしてください。" };
  }

  const res = await db.execute({
    sql: "SELECT device_id, is_archived, status FROM bottles WHERE id = ? LIMIT 1",
    args: [bottleId],
  });
  const row = res.rows[0];
  if (!row) return { ok: false, error: "このボトルは見つかりません。" };

  const owner = String(row.device_id);
  if (owner === deviceId) {
    return { ok: false, error: "自分のボトルにはいいねできません。" };
  }
  if (Number(row.is_archived) === 1 || String(row.status) !== "active") {
    return { ok: false, error: "このボトルはもういいねできません。" };
  }

  const existing = await db.execute({
    sql: "SELECT 1 FROM likes WHERE bottle_id = ? AND device_id = ? LIMIT 1",
    args: [bottleId, deviceId],
  });
  const alreadyLiked = existing.rows.length > 0;
  const now = Date.now();

  const tx = await db.transaction("write");
  try {
    if (alreadyLiked) {
      await tx.execute({
        sql: "DELETE FROM likes WHERE bottle_id = ? AND device_id = ?",
        args: [bottleId, deviceId],
      });
      await tx.execute({
        sql: "UPDATE bottles SET like_count = MAX(0, like_count - 1) WHERE id = ?",
        args: [bottleId],
      });
    } else {
      await tx.execute({
        sql: "INSERT INTO likes(bottle_id, device_id, created_at) VALUES (?, ?, ?)",
        args: [bottleId, deviceId, now],
      });
      await tx.execute({
        sql: "UPDATE bottles SET like_count = like_count + 1 WHERE id = ?",
        args: [bottleId],
      });
    }
    const cntRes = await tx.execute({
      sql: "SELECT like_count FROM bottles WHERE id = ?",
      args: [bottleId],
    });
    const likeCount = Number(cntRes.rows[0]?.like_count ?? 0);
    await tx.commit();
    revalidatePath("/");
    return { ok: true, liked: !alreadyLiked, likeCount };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export type OpenedBottle = {
  bottle_id: string;
  youtube_id: string;
  comment: string;
  picked_at: number;
};

/**
 * この端末がこれまで開封した（＝ピックした）ボトルの履歴を新しい順に返す。
 * picks には「他人のボトルを開けたとき」だけ記録される（自分のボトルは無料開封のため対象外）。
 * 海面から消えた（期限切れ・アーカイブ）ボトルも履歴としては残す。
 */
export async function getOpenedHistory(deviceId: string): Promise<OpenedBottle[]> {
  if (!DEVICE_ID_RE.test(deviceId)) return [];

  const res = await db.execute({
    sql: `SELECT b.id AS bottle_id, b.youtube_id, b.comment, p.picked_at
            FROM picks p
            JOIN bottles b ON b.id = p.bottle_id
           WHERE p.picker_device_id = ?
        ORDER BY p.picked_at DESC
           LIMIT 100`,
    args: [deviceId],
  });

  return res.rows.map((row) => ({
    bottle_id: String(row.bottle_id),
    youtube_id: String(row.youtube_id),
    comment: String(row.comment),
    picked_at: Number(row.picked_at ?? 0),
  }));
}

/** @deprecated getPickUiState を利用 */
export async function getDeviceState(deviceId: string): Promise<{ credits: number; openableCount: number }> {
  if (!DEVICE_ID_RE.test(deviceId)) return { credits: 0, openableCount: 0 };
  const pickCredits = await getCredits(deviceId);
  const openableCount = await getOpenableCount(deviceId);
  return { credits: pickCredits, openableCount };
}
