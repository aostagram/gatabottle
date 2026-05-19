// JST（UTC+9）基準の日付ユーティリティ。
// 「今日」「先月」はユーザー体感に合わせて JST で計算する。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** JST の今日 0:00 を表す UTC エポックミリ秒。 */
export function startOfJstDay(now: number = Date.now()): number {
  return Math.floor((now + JST_OFFSET_MS) / DAY_MS) * DAY_MS - JST_OFFSET_MS;
}

/**
 * JST の「先月」を表す範囲を返す。
 * - start: 先月の 1 日 0:00 (JST) の UTC ms
 * - end:   今月の 1 日 0:00 (JST) の UTC ms（exclusive 上限）
 * - label: "YYYY年M月"
 */
export function previousJstMonthRange(
  now: number = Date.now(),
): { start: number; end: number; label: string } {
  // d は UTC として扱うが、値は JST と一致する（JST_OFFSET を足したため）
  const d = new Date(now + JST_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0-11
  const prevY = m === 0 ? y - 1 : y;
  const prevM = m === 0 ? 11 : m - 1;
  const start = Date.UTC(prevY, prevM, 1) - JST_OFFSET_MS;
  const end = Date.UTC(y, m, 1) - JST_OFFSET_MS;
  return { start, end, label: `${prevY}年${prevM + 1}月` };
}
