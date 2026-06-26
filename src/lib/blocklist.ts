import blocklist from "./blocklist.json";

// YouTube oEmbed の戻り値と同じ形（src/lib/youtube.ts の fetchYoutubeAuthor / 削除スクリプト共通）。
export type YoutubeAuthor = {
  author_name?: string | null;
  author_url?: string | null;
};

/** 比較用に正規化（NFKC → 小文字 → 空白除去）。全角/半角や大文字小文字の揺れを吸収する。 */
function norm(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

// JSON の空配列は never[] と推論されるため string[] として扱う。
const BLOCKED_NAMES = (blocklist.artistNames as string[]).map(norm);
const BLOCKED_CHANNEL_IDS = (blocklist.channelIds as string[]).map((s) => s.toLowerCase());
const BLOCKED_HANDLES = (blocklist.channelHandles as string[]).map((s) => s.toLowerCase());

/**
 * YouTube oEmbed の author 情報がブロック対象かを判定する。
 * - チャンネル名(author_name)が artistNames のいずれかを含む
 * - author_url の /channel/UC... が channelIds に一致
 * - author_url の /@handle が channelHandles に一致
 */
export function isBlockedAuthor(author: YoutubeAuthor | null | undefined): boolean {
  if (!author) return false;

  const name = author.author_name ? norm(author.author_name) : "";
  if (name && BLOCKED_NAMES.some((b) => b && name.includes(b))) return true;

  const url = author.author_url ?? "";
  const idMatch = url.match(/\/channel\/(UC[\w-]+)/i);
  if (idMatch && BLOCKED_CHANNEL_IDS.includes(idMatch[1].toLowerCase())) return true;

  const handleMatch = url.match(/\/(@[\w.-]+)/);
  if (handleMatch && BLOCKED_HANDLES.includes(handleMatch[1].toLowerCase())) return true;

  return false;
}
