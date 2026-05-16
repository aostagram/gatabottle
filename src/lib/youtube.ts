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
