"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { toggleLike, type PickResult } from "@/lib/actions";

const REASON_LABEL: Record<"owner" | "already" | "fresh", string> = {
  owner: "あなたのボトル",
  already: "もう一度開封",
  fresh: "拾いました",
};

function LikeRow({
  deviceId,
  bottleId,
  initialLiked,
  initialCount,
}: {
  deviceId: string;
  bottleId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  // 別ボトルを開いたときに初期値で再同期
  useEffect(() => {
    setLiked(initialLiked);
    setCount(initialCount);
  }, [bottleId, initialLiked, initialCount]);

  function click() {
    if (pending) return;
    const next = !liked;
    // 楽観的更新
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));

    startTransition(async () => {
      const res = await toggleLike(deviceId, bottleId);
      if (res.ok) {
        setLiked(res.liked);
        setCount(res.likeCount);
      } else {
        // ロールバック
        setLiked(initialLiked);
        setCount(initialCount);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "いいねを取り消す" : "いいねする"}
      className="inline-flex items-center gap-2 rounded-full bg-sand px-5 py-2 text-sm font-semibold text-ink shadow ring-1 ring-ink/10 transition hover:bg-sand/80 disabled:opacity-50"
    >
      <span aria-hidden className="text-xl leading-none">
        {liked ? "💕" : "♡"}
      </span>
      <span>{liked ? "いいね済" : "いいね"}</span>
      <span className="text-ink/70">{count}</span>
    </button>
  );
}

export function BottleModal({
  result,
  pending,
  onClose,
  postHref,
  deviceId,
}: {
  result: PickResult | null;
  pending: boolean;
  onClose: () => void;
  postHref?: ReactNode;
  deviceId: string;
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
                  <span className="ml-2">· 開封可能 {result.openableRemaining} 本</span>
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

            {result.reason !== "owner" && deviceId ? (
              <div className="mt-5 flex justify-center">
                <LikeRow
                  deviceId={deviceId}
                  bottleId={result.bottle.id}
                  initialLiked={result.liked}
                  initialCount={result.likeCount}
                />
              </div>
            ) : result.reason === "owner" && result.likeCount > 0 ? (
              <p className="mt-5 text-center text-sm text-ink/70">
                💕 みんなから {result.likeCount} いいね
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
