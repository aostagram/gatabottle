"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { getPickUiState, pickBottle, type PickResult, type SeaBottleAccess } from "@/lib/actions";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { BottleModal } from "./BottleModal";

export type SeaBottle = { id: string };

type BottleLayout = SeaBottle & {
  topPct: number;
  delaySec: number;
  durationSec: number;
  scale: number;
};

// ボトルは画面を左→右に流す（PC・スマホ共通）。位置・速度・大きさを少しずつずらして
// 自然な漂流に見せる。クリックしにくい「動く的」問題は「🎣 ボトルを釣る」ボタンで解消する。
function layout(bottles: SeaBottle[]): BottleLayout[] {
  return bottles.map((b, i) => {
    const topPct = 30 + ((i * 17) % 55);
    const durationSec = 22 + ((i * 7) % 20);
    const delaySec = -((i * 11) % durationSec);
    const scale = 0.8 + ((i * 13) % 7) / 10;
    return { ...b, topPct, durationSec, delaySec, scale };
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
  // 「🎣 ボトルを釣る」演出中フラグ。釣り上げアニメーションを見せてから開封する。
  const [casting, setCasting] = useState(false);

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

  function openBottle(bottleId: string) {
    startTransition(async () => {
      const r = await pickBottle(deviceId, bottleId);
      setResult(r);
      if (typeof r.openableRemaining === "number") {
        setOpenableCount(r.openableRemaining);
      }
      refreshPickState(deviceId, bottleIds);
    });
  }

  function handlePick(bottleId: string) {
    if (!deviceId || pending || casting) return;
    const access = accessMap[bottleId];
    if (!canTapBottle(access, openableCount ?? 0)) return;
    openBottle(bottleId);
  }

  // 開封できるボトルの中から 1 本選ぶ。未開封（new）を優先し、無ければ自分の／再開封できるもの。
  function chooseFishTarget(): string | null {
    const candidates = laid.filter((b) => canTapBottle(accessMap[b.id], openableCount ?? 0));
    if (candidates.length === 0) return null;
    const fresh = candidates.filter((b) => accessMap[b.id] === "new");
    const pool = fresh.length > 0 ? fresh : candidates;
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  const fishTarget = useMemo(
    () => {
      // accessMap / openableCount が変わるたびに「釣れる本があるか」を判定。
      const candidates = laid.filter((b) => canTapBottle(accessMap[b.id], openableCount ?? 0));
      return candidates.length > 0;
    },
    [laid, accessMap, openableCount],
  );

  // 「🎣 ボトルを釣る」: 釣り上げアニメーションを見せてから 1 本開封する。
  function handleFish() {
    if (!deviceId || pending || casting) return;
    const target = chooseFishTarget();
    if (!target) return;
    setCasting(true);
    // 釣り演出（約 1.6s）を見せてから開封 → 開封モーダルの演出につなぐ。
    window.setTimeout(() => {
      setCasting(false);
      openBottle(target);
    }, 1600);
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

      {/* 流れるボトル（左→右へ漂流。PC・スマホ共通） */}
      {laid.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 top-[55%] z-[5] text-center text-sm text-ink/70 px-6">
          まだ海にボトルがありません。
          <br />
          最初の 1 本を流してみませんか？
        </div>
      ) : (
        <div
          aria-label="海面に流れるボトル"
          className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
        >
          {laid.map((b) => {
            const access = accessMap[b.id];
            const tappable = canTapBottle(access, openableCount ?? 0);
            const isRead = access === "replay";
            return (
              <button
                key={b.id}
                type="button"
                disabled={pending || casting || !deviceId || !tappable}
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
                className="drift pointer-events-auto absolute -left-16 select-none text-4xl sm:text-5xl transition hover:drop-shadow-[0_0_12px_rgba(255,180,120,0.6)] focus:outline-none focus-visible:drop-shadow-[0_0_12px_rgba(255,180,120,0.9)] disabled:opacity-60"
                style={{
                  top: `${b.topPct}%`,
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

      {/* 「🎣 ボトルを釣る」ボタン（タイトルと「ボトルを流す」ボタンの間に配置）。
          流れるボトルを直接タップしなくても、ここから 1 本を釣り上げて開封できる。
          スマホでも押しやすいよう中央下に大きく置く。 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[27%] z-20 flex flex-col items-center gap-2 px-6">
        <button
          type="button"
          onClick={handleFish}
          disabled={pending || casting || !deviceId || !fishTarget}
          aria-label="ボトルを釣り上げて開封する"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-ribbon px-8 py-4 text-base font-semibold tracking-widest text-sand shadow-xl ring-2 ring-white/40 transition hover:bg-ribbon/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          🎣 ボトルを釣る
        </button>
        {laid.length > 0 && !fishTarget && openableCount !== null && (
          <p className="pointer-events-none rounded-full bg-sand/80 px-3 py-1 text-[11px] text-ink/70 shadow backdrop-blur">
            今は開封できるボトルがありません。ボトルを流すと釣れます。
          </p>
        )}
      </div>

      {/* 釣り上げ演出: 竿から糸が下りてボトルを引き上げる。完了後に開封モーダルへ。 */}
      {casting && (
        <div
          role="status"
          aria-label="ボトルを釣り上げています"
          className="pointer-events-none fixed inset-0 z-40 bg-ink/30 backdrop-blur-[1px]"
        >
          {/* 竿 + 糸（糸の長さがアニメーションで伸び縮みする） */}
          <div className="absolute left-1/2 top-[10vh] -translate-x-1/2 flex flex-col items-center">
            <span className="text-5xl leading-none">🎣</span>
            <span aria-hidden className="cast-line block w-[2px] bg-ink/50" />
          </div>
          {/* 釣り上げられるボトル */}
          <span className="cast-bottle absolute left-1/2 top-[17vh] text-5xl leading-none">🍾</span>
          <p className="absolute inset-x-0 bottom-[22%] text-center text-sm font-semibold tracking-widest text-sand drop-shadow">
            🎣 ボトルを釣り上げています…
          </p>
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
