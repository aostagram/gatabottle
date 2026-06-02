"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOpenedHistory, type OpenedBottle } from "@/lib/actions";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { youtubeEmbedUrl } from "@/lib/youtube";

const jstDate = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function HistoryList() {
  // null = 読み込み中。device_id は localStorage 依存なのでクライアントで取得する。
  const [items, setItems] = useState<OpenedBottle[] | null>(null);

  useEffect(() => {
    const deviceId = getOrCreateDeviceId();
    getOpenedHistory(deviceId)
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  if (items === null) {
    return (
      <p className="relative z-10 mt-8 text-sm text-ink/70">読み込み中…</p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="relative z-10 max-w-md text-center text-sm text-ink/80 mt-8">
        <p>まだ開封した曲はありません。</p>
        <p className="mt-2 text-ink/60">
          海に流れるボトルを拾って開けると、ここに記録されていきます。
        </p>
        <p className="mt-6">
          <Link
            href="/"
            className="text-sm text-ink/80 underline-offset-4 hover:underline"
          >
            ← 海にもどる
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <ol className="relative z-10 w-full max-w-lg flex flex-col gap-6">
        {items.map((item) => (
          <li
            key={`${item.bottle_id}-${item.picked_at}`}
            className="rounded-3xl bg-sand/90 p-5 shadow-md backdrop-blur"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🎧</span>
              <span className="text-xs tracking-widest text-ink/70">
                {jstDate.format(new Date(item.picked_at))} に開封
              </span>
            </div>
            <p className="text-sm sm:text-base text-ink mb-3 leading-relaxed">
              {item.comment}
            </p>
            <div className="overflow-hidden rounded-2xl bg-ink/5 aspect-video">
              <iframe
                src={youtubeEmbedUrl(item.youtube_id)}
                title="開封した音楽"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-full w-full"
              />
            </div>
          </li>
        ))}
      </ol>

      <p className="relative z-10 mt-10">
        <Link
          href="/"
          className="text-sm text-ink/80 underline-offset-4 hover:underline"
        >
          ← 海にもどる
        </Link>
      </p>
    </>
  );
}
