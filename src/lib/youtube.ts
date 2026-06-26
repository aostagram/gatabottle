// YouTube URL から video ID を抽出する。
// 対応形式:
//   https://www.youtube.com/watch?v=XXXX
//   https://youtu.be/XXXX
//   https://www.youtube.com/shorts/XXXX
//   https://www.youtube.com/embed/XXXX
//   https://music.youtube.com/watch?v=XXXX

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function extractYoutubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return ID_RE.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && ID_RE.test(v)) return v;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "v") {
      const id = parts[1];
      return id && ID_RE.test(id) ? id : null;
    }
  }

  return null;
}

export function youtubeEmbedUrl(youtubeId: string): string {
  return `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`;
}

export type YoutubeAuthorInfo = { author_name: string | null; author_url: string | null };

/**
 * YouTube oEmbed から動画の投稿チャンネル情報（author_name / author_url）を取得する。
 * API キー不要。動画が非公開・削除・埋め込み不可・通信失敗のときは null を返す（= 判定不能）。
 */
export async function fetchYoutubeAuthor(
  youtubeId: string,
  timeoutMs = 4000,
): Promise<YoutubeAuthorInfo | null> {
  const target = `https://www.youtube.com/watch?v=${youtubeId}`;
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(oembed, { signal: controller.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as { author_name?: string; author_url?: string };
    return {
      author_name: json.author_name ?? null,
      author_url: json.author_url ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
