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
      setAccessMap(s.access);
    });
  }, [deviceId, bottleIds]);

  function refreshPickState(id: string, ids: string[]) {
    getPickUiState(id, ids).then((s) => {
      setOpenableCount(s.openableCount);
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
      <div className="pointer-events-auto absolute right-4 top-4 z-20 rounded-full bg-sand/85 px-4 py-2 text-xs text-ink/80 shadow-md backdrop-blur">
        {openableCount === null
          ? "🍾 …"
          : openableCount > 0
            ? `🍾 開封可能 ${openableCount} 本`
            : "🍾 開封可能 0 本"}
      </div>

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
                    ? "もう一度開封する"
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
              🍾
            </button>
            );
          })}
        </div>
      )}

      <BottleModal
        result={result}
        pending={pending}
        onClose={() => setResult(null)}
        postHref={<Link href="/post" className="underline">ボトルを流す</Link>}
      />
    </>
  );
}
