"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { getPickUiState, pickBottle, type PickResult, type SeaBottleAccess } from "@/lib/actions";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { BottleModal } from "./BottleModal";

export type SeaBottle = { id: string };

type BottleLayout = SeaBottle & {
  // 浮遊アニメーションの開始位置をずらして、全部が同時に動かないようにする。
  delaySec: number;
  durationSec: number;
  scale: number;
};

function layout(bottles: SeaBottle[]): BottleLayout[] {
  return bottles.map((b, i) => {
    const durationSec = 4 + ((i * 7) % 4);
    const delaySec = -((i * 11) % 5);
    const scale = 0.9 + ((i * 13) % 5) / 10;
    return { ...b, durationSec, delaySec, scale };
  });
}

function canTapBottle(access: SeaBottleAccess | undefined, openableCount: number): boolean {
  if (!access || access === "locked") return false;
  if (access === "owner") return true;
  // 新規・再開封とも、開封に使える残数が無ければ開けない（サーバ側でも再検証する）。
  return openableCount >= 1;
}

export function BottleSea({ bottles }: { bottles: SeaBottle[] }) {
  const laid = useMemo(() => layout(bottles), [bottles]);
  const bottleIds = useMemo(() => bottles.map((b) => b.id), [bottles]);
  const [deviceId, setDeviceId] = useState("");
  const [openableCount, setOpenableCount] = useState<number | null>(null);
  const [freeOpensRemaining, setFreeOpensRemaining] = useState(0);
  const [accessMap, setAccessMap] = useState<Record<string, SeaBottleAccess>>({});
  const [result, setResult] = useState<PickResult | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    getPickUiState(deviceId, bottleIds).then((s) => {
      setOpenableCount(s.openableCount);
      setFreeOpensRemaining(s.freeOpensRemaining);
      setAccessMap(s.access);
    });
  }, [deviceId, bottleIds]);

  function refreshPickState(id: string, ids: string[]) {
    getPickUiState(id, ids).then((s) => {
      setOpenableCount(s.openableCount);
      setFreeOpensRemaining(s.freeOpensRemaining);
      setAccessMap(s.access);
    });
  }

  function handlePick(bottleId: string) {
    if (!deviceId || pending) return;
    const access = accessMap[bottleId];
    if (!canTapBottle(access, openableCount ?? 0)) return;

    startTransition(async () => {
      const r = await pickBottle(deviceId, bottleId);
      setResult(r);
      if (typeof r.openableRemaining === "number") {
        setOpenableCount(r.openableRemaining);
      }
      refreshPickState(deviceId, bottleIds);
    });
  }

  return (
    <>
      {/* ピック権 HUD */}
      <div className="pointer-events-auto absolute right-4 top-4 z-20 flex flex-col items-end gap-1">
        <div className="rounded-full bg-sand/85 px-4 py-2 text-xs text-ink/80 shadow-md backdrop-blur">
          {openableCount === null ? "🍾 …" : `🍾 開封可能 ${openableCount} 本`}
        </div>
        {freeOpensRemaining > 0 && (
          <div className="rounded-full bg-ribbon/90 px-4 py-2 text-xs font-semibold text-sand shadow-md backdrop-blur">
            🎁 今日の無料開封 のこり {freeOpensRemaining} 本
          </div>
        )}
      </div>

      {/* 集約したボトル置き場（タイトルと「ボトルを流す」ボタンの間に配置）。
          以前は画面全体を横切って流れていて「動く的」だったのでクリックしにくかった。
          中央エリアにまとめ、その場でゆらゆら浮かぶだけにして開けやすくする。 */}
      {laid.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 top-[55%] z-[5] text-center text-sm text-ink/70 px-6">
          まだ海にボトルがありません。
          <br />
          最初の 1 本を流してみませんか？
        </div>
      ) : (
        <div
          aria-label="海面に集まったボトル"
          className="pointer-events-none absolute inset-x-0 top-[40%] bottom-[24%] z-[5] flex flex-wrap content-center items-center justify-center gap-x-5 gap-y-3 overflow-y-auto px-6"
        >
          {laid.map((b) => {
            const access = accessMap[b.id];
            const tappable = canTapBottle(access, openableCount ?? 0);
            const isRead = access === "replay";
            return (
            <button
              key={b.id}
              type="button"
              disabled={pending || !deviceId || !tappable}
              onClick={() => handlePick(b.id)}
              aria-label={
                access === "owner"
                  ? "自分のボトルを開ける"
                  : access === "replay"
                    ? "開封済みのボトルをもう一度開封する"
                    : access === "new"
                      ? "ボトルを新規開封する"
                      : "開封できません"
              }
              className="float pointer-events-auto select-none text-4xl sm:text-5xl transition hover:drop-shadow-[0_0_12px_rgba(255,180,120,0.6)] focus:outline-none focus-visible:drop-shadow-[0_0_12px_rgba(255,180,120,0.9)] disabled:opacity-60"
              style={{
                animationDuration: `${b.durationSec}s`,
                animationDelay: `${b.delaySec}s`,
                ["--bot-scale" as string]: b.scale,
              }}
            >
              <span className="relative inline-block">
                <span className={isRead ? "opacity-60" : ""}>🍾</span>
                {isRead && (
                  <span
                    aria-hidden
                    className="absolute -top-1 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-sand text-[11px] font-bold text-ink shadow ring-2 ring-white"
                  >
                    ✓
                  </span>
                )}
              </span>
            </button>
            );
          })}
        </div>
      )}

      <BottleModal
        result={result}
        pending={pending}
        deviceId={deviceId}
        onClose={() => setResult(null)}
        postHref={<Link href="/post" className="underline">ボトルを流す</Link>}
      />
    </>
  );
}
