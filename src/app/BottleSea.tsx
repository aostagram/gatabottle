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
  if (access === "new" && openableCount < 1) return false;
  return true;
}

export function BottleSea({ bottles }: { bottles: SeaBottle[] }) {
  const laid = useMemo(() => layout(bottles), [bottles]);
  const bottleIds = useMemo(() => bottles.map((b) => b.id), [bottles]);
  const [deviceId, setDeviceId] = useState("");
  const [openableCount, setOpenableCount] = useState<number | null>(null);
  const [exploreUnlocked, setExploreUnlocked] = useState(false);
  const [exploreRemaining, setExploreRemaining] = useState(0);
  const [exploreVisibleCount, setExploreVisibleCount] = useState(0);
  const [accessMap, setAccessMap] = useState<Record<string, SeaBottleAccess>>({});
  const [result, setResult] = useState<PickResult | null>(null);
  const [pending, startTransition] = useTransition();
  // 3 本目を流した直後（/?sea_opened=1）に「海が開かれました」演出を出す。
  const [showSeaOpened, setShowSeaOpened] = useState(false);

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("sea_opened") === "1") {
      setShowSeaOpened(true);
      // 一度見せたら URL から外す（リロードや共有で再表示されないように）。
      params.delete("sea_opened");
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    getPickUiState(deviceId, bottleIds).then((s) => {
      setOpenableCount(s.openableCount);
      setExploreUnlocked(s.exploreUnlocked);
      setExploreRemaining(s.exploreRemaining);
      setExploreVisibleCount(s.exploreVisibleCount);
      setAccessMap(s.access);
    });
  }, [deviceId, bottleIds]);

  function refreshPickState(id: string, ids: string[]) {
    getPickUiState(id, ids).then((s) => {
      setOpenableCount(s.openableCount);
      setExploreUnlocked(s.exploreUnlocked);
      setExploreRemaining(s.exploreRemaining);
      setExploreVisibleCount(s.exploreVisibleCount);
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
        {exploreUnlocked && exploreRemaining > 0 && (
          <div className="rounded-full bg-ribbon/90 px-4 py-2 text-xs font-semibold text-sand shadow-md backdrop-blur">
            🌊 探索 のこり {exploreRemaining} 本
          </div>
        )}
      </div>

      {/* 3 本目を流した直後の「海が開かれました」演出 */}
      {showSeaOpened && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="海探索モード解放"
          className="open-anim pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm"
          onClick={() => setShowSeaOpened(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-sand p-7 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-5xl">🌊</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink">海が開かれました</h2>
            <p className="mt-4 text-base text-ink/85">
              本日探索可能：<span className="text-2xl font-bold text-ribbon">{exploreVisibleCount}</span> 本
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink/60">
              今日だけ、まだ開けていないボトルを追加で探せます。
              <br />
              翌日 0:00 にリセットされます。
            </p>
            <button
              type="button"
              onClick={() => setShowSeaOpened(false)}
              className="mt-6 w-full rounded-full bg-ribbon px-6 py-3 text-sm font-semibold tracking-widest text-sand shadow-md transition hover:bg-ribbon/90"
            >
              海を探索する
            </button>
          </div>
        </div>
      )}

      {/* 流れるボトル */}
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
