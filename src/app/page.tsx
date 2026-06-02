import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { BottleSea, type SeaBottle } from "./BottleSea";
import { HelpButton } from "./HelpButton";
import { WaveAudio } from "./WaveAudio";

// 海面のボトル一覧は投稿ごとに変わるので、リクエストごとに SSR する。
// prerender されると seed 後の DB 変更が反映されない。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

async function getActiveBottles(): Promise<SeaBottle[]> {
  const now = Date.now();
  const result = await db.execute({
    sql: `SELECT id
            FROM bottles
           WHERE is_archived = 0
             AND status = 'active'
             AND expires_at > ?
        ORDER BY created_at DESC
           LIMIT 30`,
    args: [now],
  });
  return result.rows.map((row) => ({ id: String(row.id) }));
}

export default async function Home() {
  const bottles = await getActiveBottles();

  return (
    <main className="relative flex-1 flex flex-col items-center justify-between overflow-hidden">
      {/* きらきら */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <span
            key={i}
            className="shimmer absolute rounded-full bg-white/70"
            style={{
              top: `${((i * 53) % 60) + 5}%`,
              left: `${((i * 37) % 95) + 2}%`,
              width: `${(i % 3) + 2}px`,
              height: `${(i % 3) + 2}px`,
              animationDelay: `${(i * 0.3) % 3}s`,
            }}
          />
        ))}
      </div>

      {/* 左上のツール群（波の音 + 使い方） */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        <WaveAudio />
        <HelpButton />
      </div>

      {/* 流れるボトル */}
      <BottleSea bottles={bottles} />

      {/* タイトル */}
      <header className="relative z-10 pt-16 sm:pt-24 text-center px-6">
        <p className="text-sm sm:text-base tracking-[0.4em] text-ink/70 mb-3">
          NIIGATA — MUSIC IN A BOTTLE
        </p>
        <h1 className="text-5xl sm:text-7xl font-semibold text-ink drop-shadow-sm">
          潟ボトル
        </h1>
        <p className="mt-2 text-xl sm:text-2xl text-ink/80 tracking-widest">
          GATA BOTTLE
        </p>
        <p className="mt-3 text-xs sm:text-sm tracking-[0.3em] text-ink/65">
          新潟発・音楽交換ボトルメール
        </p>
        <p className="mt-6 max-w-md mx-auto text-base sm:text-lg leading-relaxed text-ink/85">
          新潟の海に、音楽をボトルに詰めて流す。
          <br />
          誰かが、いつか、拾ってくれるかもしれない。
        </p>
      </header>

      {/* 海面の波 */}
      <div
        aria-hidden
        className="relative z-10 w-full mt-8 overflow-hidden"
        style={{ height: "120px" }}
      >
        <svg
          className="wave absolute bottom-0 left-0"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          style={{ width: "200%", height: "120px" }}
        >
          <path
            d="M0,60 C240,100 480,20 720,60 C960,100 1200,20 1440,60 L1440,120 L0,120 Z"
            fill="rgba(255,255,255,0.18)"
          />
          <path
            d="M0,80 C240,40 480,120 720,80 C960,40 1200,120 1440,80 L1440,120 L0,120 Z"
            fill="rgba(255,255,255,0.12)"
          />
        </svg>
      </div>

      {/* CTA */}
      <footer className="relative z-10 w-full px-6 pb-10 pt-2 text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/post"
            className="inline-block rounded-full bg-ribbon px-7 py-3 text-sm font-semibold tracking-widest text-sand shadow-lg transition hover:bg-ribbon/90"
          >
            🍾 ボトルを流す
          </Link>
          <Link
            href="/ranking"
            className="inline-block rounded-full bg-sand/80 px-6 py-3 text-sm font-semibold tracking-widest text-ink shadow-md backdrop-blur transition hover:bg-sand"
          >
            📜 先週のベスト3
          </Link>
          <Link
            href="/history"
            className="inline-block rounded-full bg-sand/80 px-6 py-3 text-sm font-semibold tracking-widest text-ink shadow-md backdrop-blur transition hover:bg-sand"
          >
            🎧 開封した曲
          </Link>
        </div>
        <p className="mt-4 text-xs tracking-widest text-ink/60">
          v0.1 · gatabottle.com
        </p>
        <p className="mt-3 max-w-lg mx-auto text-[11px] leading-relaxed text-ink/55">
          潟ボトルは、新潟から音楽をシェア・交換するためのアプリです。
          YouTube リンクをボトルに詰めて海に流すと、知らない誰かが拾って聴いてくれます。
          新潟の音楽好きが集う、偶然の音楽出会いをつくるコミュニティ。
        </p>
      </footer>
    </main>
  );
}
