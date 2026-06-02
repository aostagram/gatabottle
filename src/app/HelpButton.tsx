"use client";

import { useEffect, useState } from "react";

/**
 * 新規ユーザー向けの「使い方」ボタン。
 * 波の音アイコンと同じデザイン感で並ぶ "?" 丸ボタン。
 * タップすると半透明オーバーレイの上に使い方カードが出る。
 * 背景タップ / 閉じるボタン / Esc で閉じる。
 */
export function HelpButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    // 開いてる間は背景スクロールを止める
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="使い方を見る"
        title="使い方を見る"
        className="pointer-events-auto rounded-full bg-sand/85 px-3 py-2 text-base shadow-md backdrop-blur transition hover:bg-sand"
      >
        ❔
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-title"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl bg-sand p-6 sm:p-8 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="閉じる"
              className="absolute right-3 top-3 rounded-full px-2 py-1 text-ink/60 transition hover:bg-ink/5 hover:text-ink"
            >
              ✕
            </button>

            <header className="text-center mb-5">
              <p className="text-xs tracking-[0.3em] text-ink/60 mb-1">HOW TO PLAY</p>
              <h2 id="help-title" className="text-xl sm:text-2xl font-semibold text-ink">
                潟ボトルの遊び方
              </h2>
            </header>

            <ol className="space-y-3 text-sm sm:text-base text-ink/85 leading-relaxed">
              <li className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-ribbon/15 text-ribbon font-semibold flex items-center justify-center text-sm">
                  1
                </span>
                <span>
                  <strong className="text-ink">🍾 ボトルを拾う</strong>
                  <br />
                  海面を流れるボトルをタップ。中身の音楽と、流した人の一言コメントが見られます。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-ribbon/15 text-ribbon font-semibold flex items-center justify-center text-sm">
                  2
                </span>
                <span>
                  <strong className="text-ink">💕 気に入ったら、いいね</strong>
                  <br />
                  音楽が気に入ったら、ハートで応援。先週の人気曲は「先週のベスト3」で見られます。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-ribbon/15 text-ribbon font-semibold flex items-center justify-center text-sm">
                  3
                </span>
                <span>
                  <strong className="text-ink">📮 自分の音楽を流す</strong>
                  <br />
                  「ボトルを流す」から YouTube リンクと一言を添えて投稿。誰かに、いつか拾われます。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-ribbon/15 text-ribbon font-semibold flex items-center justify-center text-sm">
                  4
                </span>
                <span>
                  <strong className="text-ink">✨ 拾う権利を増やす</strong>
                  <br />
                  ボトルを 1 本流すごとに、あなたの「拾う権利」が 1 つ増えます。
                </span>
              </li>
            </ol>

            <p className="mt-5 text-center text-xs text-ink/55">
              🔈 左上のスピーカーをタップすると、波の音が流れます
            </p>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-full bg-ribbon px-6 py-3 text-sm font-semibold tracking-widest text-sand shadow-md transition hover:bg-ribbon/90"
            >
              海にもどる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
