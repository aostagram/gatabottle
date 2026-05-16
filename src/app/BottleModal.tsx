"use client";

import { useEffect, type ReactNode } from "react";
import { youtubeEmbedUrl } from "@/lib/youtube";
import type { PickResult } from "@/lib/actions";

const REASON_LABEL: Record<"owner" | "already" | "fresh", string> = {
  owner: "あなたのボトル",
  already: "もう一度開封",
  fresh: "拾いました",
};

export function BottleModal({
  result,
  pending,
  onClose,
  postHref,
}: {
  result: PickResult | null;
  pending: boolean;
  onClose: () => void;
  postHref?: ReactNode;
}) {
  const visible = pending || result !== null;

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ボトル開封"
      className="open-anim fixed inset-0 z-50 flex items-center justify-center bg-ink/55 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-sand p-5 sm:p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-3 top-3 rounded-full bg-ink/10 px-3 py-1 text-sm text-ink/70 hover:bg-ink/20"
        >
          ×
        </button>

        {pending && (
          <div className="py-12 text-center">
            <p className="text-base text-ink/80">🌊 開封中…</p>
          </div>
        )}

        {!pending && result && result.ok === false && (
          <div className="py-8 text-center">
            <p className="text-xs tracking-[0.4em] text-ink/60 mb-3">CAN&apos;T OPEN</p>
            <p className="text-base text-ink leading-relaxed">{result.error}</p>
            {postHref && (
              <p className="mt-5 text-sm text-ink/80">{postHref}</p>
            )}
          </div>
        )}

        {!pending && result && result.ok && (
          <>
            <div className="mb-4 text-center">
              <p className="text-xs tracking-[0.4em] text-ink/60">
                {REASON_LABEL[result.reason]}
                {result.cost === 1 && (
                  <span className="ml-2">· 残ピック {result.remaining}</span>
                )}
              </p>
              <p className="mt-2 text-base sm:text-lg text-ink leading-relaxed">
                {result.bottle.comment}
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl bg-ink/5 aspect-video">
              <iframe
                src={youtubeEmbedUrl(result.bottle.youtube_id)}
                title="ボトルの中の音楽"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-full w-full"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
