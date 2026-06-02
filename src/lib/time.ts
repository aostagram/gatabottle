// JST（UTC+9）基準の日付ユーティリティ。
// 「今日」「先週」はユーザー体感に合わせて JST で計算する。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** JST の今日 0:00 を表す UTC エポックミリ秒。 */
export function startOfJstDay(now: number = Date.now()): number {
  return Math.floor((now + JST_OFFSET_MS) / DAY_MS) * DAY_MS - JST_OFFSET_MS;
}

/**
 * JST の「先週」を表す範囲を返す（週は月曜はじまり）。
 * - start: 先週の月曜 0:00 (JST) の UTC ms
 * - end:   今週の月曜 0:00 (JST) の UTC ms（exclusive 上限）
 * - label: "M月D日〜M月D日"（先週の月曜〜日曜）
 * JST には夏時間がなく 1 日は常に 24h なので、日数の加減算だけで境界を求められる。
 */
export function previousJstWeekRange(
  now: number = Date.now(),
): { start: number; end: number; label: string } {
  // 値は JST の壁時計と一致する（JST_OFFSET を足したため）
  const d = new Date(now + JST_OFFSET_MS);
  const dow = d.getUTCDay(); // 0=日, 1=月, ..., 6=土
  // 月曜を週初めとしたときの「今週の月曜からの経過日数」（月=0 ... 日=6）
  const daysSinceMonday = (dow + 6) % 7;
  // 今週の月曜 0:00 (JST) の UTC ms
  const thisMonday = startOfJstDay(now) - daysSinceMonday * DAY_MS;
  const start = thisMonday - 7 * DAY_MS; // 先週の月曜
  const end = thisMonday; // 今週の月曜（exclusive）

  const ls = new Date(start + JST_OFFSET_MS); // 先週の月曜
  const le = new Date(end - DAY_MS + JST_OFFSET_MS); // 先週の日曜
  const label = `${ls.getUTCMonth() + 1}月${ls.getUTCDate()}日〜${le.getUTCMonth() + 1}月${le.getUTCDate()}日`;
  return { start, end, label };
}
