"use client";

import { useEffect } from "react";
import { youtubeEmbedUrl } from "@/lib/youtube";
import type { SeaBottle } from "./BottleSea";

export function BottleModal({
  bottle,
  onClose,
}: {
  bottle: SeaBottle | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!bottle) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bottle, onClose]);

  if (!bottle) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ボトルを開封"
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

        <div className="mb-4 text-center">
          <p className="text-xs tracking-[0.4em] text-ink/60">A BOTTLE OPENED</p>
          <p className="mt-1 text-base sm:text-lg text-ink leading-relaxed">
            {bottle.comment}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-ink/5 aspect-video">
          <iframe
            src={youtubeEmbedUrl(bottle.youtube_id)}
            title="ボトルの中の音楽"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
