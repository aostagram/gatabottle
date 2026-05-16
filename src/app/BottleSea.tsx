"use client";

import { useMemo, useState } from "react";
import { BottleModal } from "./BottleModal";

export type SeaBottle = {
  id: string;
  youtube_id: string;
  comment: string;
};

type BottleLayout = SeaBottle & {
  topPct: number;
  delaySec: number;
  durationSec: number;
  scale: number;
};

function layout(bottles: SeaBottle[]): BottleLayout[] {
  return bottles.map((b, i) => {
    // 海面の縦範囲（％）と、流れる速度をボトルごとに散らす
    const topPct = 30 + ((i * 17) % 55); // 30%–85% の間
    const durationSec = 22 + ((i * 7) % 20); // 22s–42s
    const delaySec = -((i * 11) % durationSec); // 既に流れている状態でスタート
    const scale = 0.8 + ((i * 13) % 7) / 10; // 0.8–1.4
    return { ...b, topPct, durationSec, delaySec, scale };
  });
}

export function BottleSea({ bottles }: { bottles: SeaBottle[] }) {
  const laid = useMemo(() => layout(bottles), [bottles]);
  const [open, setOpen] = useState<SeaBottle | null>(null);

  if (laid.length === 0) {
    return (
      <div className="relative z-10 mt-6 mb-2 text-center text-sm text-ink/70">
        まだ海にボトルがありません。
        <br />
        最初の 1 本を流してみませんか？
      </div>
    );
  }

  return (
    <>
      <div
        aria-label="海面に流れるボトル"
        className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      >
        {laid.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setOpen(b)}
            aria-label={`ボトルを開ける: ${b.comment.slice(0, 24)}`}
            className="drift pointer-events-auto absolute -left-16 select-none text-4xl sm:text-5xl transition hover:drop-shadow-[0_0_12px_rgba(255,180,120,0.6)] focus:outline-none focus-visible:drop-shadow-[0_0_12px_rgba(255,180,120,0.9)]"
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

      <BottleModal bottle={open} onClose={() => setOpen(null)} />
    </>
  );
}
