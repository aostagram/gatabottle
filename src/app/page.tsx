import type { Metadata } from "next";
import { WaveAudio } from "./WaveAudio";

// サービス終了ページ。DB アクセスは一切行わないので、ビルド時に静的生成される
// （= リクエストごとの SSR / Turso への接続が発生しない）。
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// 終了日を変える場合はここだけ直す。
const SERVICE_END_LABEL = "2026年8月8日";

export default function Home() {
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

      {/* 波の音だけは、まだ流れています */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        <WaveAudio />
      </div>

      {/* タイトル */}
      <header className="relative z-10 pt-12 sm:pt-16 text-center px-6">
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
      </header>

      {/* サービス終了のお知らせ */}
      <section
        aria-labelledby="closed-title"
        className="relative z-10 mx-6 mt-10 w-full max-w-md rounded-3xl bg-sand/90 px-6 py-7 text-center shadow-xl backdrop-blur sm:px-8"
      >
        <p aria-hidden className="bob text-5xl leading-none">
          🍾
        </p>
        <p className="mt-4 text-xs tracking-[0.3em] text-ink/60">
          THANK YOU
        </p>
        <h2
          id="closed-title"
          className="mt-2 text-xl sm:text-2xl font-semibold text-ink"
        >
          {/* 日本語は単語の途中で折り返されるので、文節ごとに inline-block で包んで
              区切りのいい位置で改行させる。 */}
          <span className="inline-block">潟ボトルは、</span>
          <span className="inline-block">サービスを終了しました</span>
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-ink/80">
          <span className="inline-block">{SERVICE_END_LABEL}をもって、</span>
          <span className="inline-block">潟ボトルのサービスを終了しました。</span>
          <br />
          <span className="inline-block">ボトルを流す・拾う・いいねなどの機能は、</span>
          <span className="inline-block">すべて停止しています。</span>
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink/80">
          海に流していただいた一本一本と、
          <br />
          知らない誰かの曲を拾ってくれたみなさんへ。
          <br />
          ほんとうに、ありがとうございました。
        </p>
        <p className="mt-5 text-xs leading-relaxed text-ink/60">
          ※ 投稿された曲・コメント・開封履歴は公開されません。
        </p>
      </section>

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

      <footer className="relative z-10 w-full px-6 pb-10 pt-2 text-center">
        {/* 海の深い部分に重なるので、フッターだけ砂色で読めるようにする */}
        <p className="text-xs tracking-widest text-sand/75">
          v0.1 · gatabottle.com
        </p>
        <p className="mt-3 max-w-lg mx-auto text-[11px] leading-relaxed text-sand/70">
          潟ボトルは、新潟から音楽をシェア・交換するためのアプリでした。
          YouTube リンクをボトルに詰めて海に流すと、知らない誰かが拾って聴いてくれる。
          そんな偶然の音楽出会いを、たくさんの方に楽しんでいただきました。
        </p>
      </footer>
    </main>
  );
}
