import Link from "next/link";
import { db } from "@/lib/db";
import { previousJstMonthRange } from "@/lib/time";
import { youtubeEmbedUrl } from "@/lib/youtube";

export const metadata = {
  title: "先月のベスト3 | 潟ボトル",
};

// 月またぎや pick_count 変動に追従するため、リクエストごとに SSR する。
export const dynamic = "force-dynamic";

type RankRow = {
  youtube_id: string;
  comment: string;
  pick_count: number;
};

async function getMonthlyTop3(): Promise<{ rows: RankRow[]; label: string }> {
  const { start, end, label } = previousJstMonthRange();
  const res = await db.execute({
    sql: `SELECT youtube_id, comment, pick_count
            FROM bottles
           WHERE created_at >= ?
             AND created_at <  ?
        ORDER BY pick_count DESC, created_at DESC
           LIMIT 3`,
    args: [start, end],
  });
  return {
    label,
    rows: res.rows.map((r) => ({
      youtube_id: String(r.youtube_id),
      comment: String(r.comment),
      pick_count: Number(r.pick_count ?? 0),
    })),
  };
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function RankingPage() {
  const { rows, label } = await getMonthlyTop3();

  return (
    <main className="relative flex-1 flex flex-col items-center overflow-hidden px-6 py-12">
      <header className="relative z-10 text-center mb-10">
        <p className="text-sm tracking-[0.4em] text-ink/70 mb-2">MONTHLY TOP 3</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-ink">
          {label}のベスト3
        </h1>
        <p className="mt-3 text-xs text-ink/70">拾われた数の多いボトル</p>
      </header>

      {rows.length === 0 ? (
        <div className="relative z-10 max-w-md text-center text-sm text-ink/80 mt-8">
          <p>まだランキングできるボトルがありません。</p>
          <p className="mt-2 text-ink/60">
            先月の終わりに、海面で拾われた数の多いボトル上位 3 本が並びます。
          </p>
        </div>
      ) : (
        <ol className="relative z-10 w-full max-w-lg flex flex-col gap-6">
          {rows.map((r, i) => (
            <li
              key={i}
              className="rounded-3xl bg-sand/90 p-5 shadow-md backdrop-blur"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{MEDAL[i] ?? "🍾"}</span>
                <span className="text-xs tracking-widest text-ink/70">
                  拾われ {r.pick_count}
                </span>
              </div>
              <p className="text-sm sm:text-base text-ink mb-3 leading-relaxed">
                {r.comment}
              </p>
              <div className="overflow-hidden rounded-2xl bg-ink/5 aspect-video">
                <iframe
                  src={youtubeEmbedUrl(r.youtube_id)}
                  title={`第 ${i + 1} 位の音楽`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="h-full w-full"
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="relative z-10 mt-10">
        <Link
          href="/"
          className="text-sm text-ink/80 underline-offset-4 hover:underline"
        >
          ← 海にもどる
        </Link>
      </p>
    </main>
  );
}
