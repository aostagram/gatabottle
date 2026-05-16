// 端末ID（= ユーザー識別子）を localStorage で発行・保持する。
// 仕様: 端末をまたぐと別ユーザー扱い。認証なし設計のためこれで十分。

const STORAGE_KEY = "gatabottle_device_id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing && existing.length > 0) return existing;
  const fresh = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}
