"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { getDeviceState, pickBottle, type PickResult } from "@/lib/actions";
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

export function BottleSea({ bottles }: { bottles: SeaBottle[] }) {
  const laid = useMemo(() => layout(bottles), [bottles]);
  const [deviceId, setDeviceId] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [result, setResult] = useState<PickResult | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    getDeviceState(id).then((s) => setCredits(s.credits));
  }, []);

  function handlePick(bottleId: string) {
    if (!deviceId || pending) return;
    startTransition(async () => {
      const r = await pickBottle(deviceId, bottleId);
      setResult(r);
      if (r.ok) {
        setCredits(r.remaining);
      } else if (typeof r.remaining === "number") {
        setCredits(r.remaining);
      }
    });
  }

  return (
    <>
      {/* ピック権 HUD */}
      <div className="pointer-events-auto absolute right-4 top-4 z-20 rounded-full bg-sand/85 px-4 py-2 text-xs text-ink/80 shadow-md backdrop-blur">
        {credits === null
          ? "🍾 …"
          : credits > 0
            ? `🍾 拾える残り ${credits} 本`
            : "🍾 まずは 1 本流そう"}
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
          {laid.map((b) => (
            <button
              key={b.id}
              type="button"
              disabled={pending || !deviceId}
              onClick={() => handlePick(b.id)}
              aria-label="ボトルを開ける"
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
          ))}
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
