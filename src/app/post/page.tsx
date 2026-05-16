import { PostForm } from "./PostForm";

export const metadata = {
  title: "ボトルを流す | 潟ボトル",
};

export default function PostPage() {
  return (
    <main className="relative flex-1 flex flex-col items-center justify-start overflow-hidden px-6 py-12">
      <header className="relative z-10 text-center mb-10">
        <p className="text-sm tracking-[0.4em] text-ink/70 mb-2">POST A BOTTLE</p>
        <h1 className="text-4xl sm:text-5xl font-semibold text-ink">
          海に流す
        </h1>
        <p className="mt-3 text-sm text-ink/80">
          YouTube リンクと、一言メッセージを添えて。
          <br />
          ボトルは 7 日間、誰かに拾われるのを待ちます。
        </p>
      </header>

      <PostForm />

      <p className="relative z-10 mt-10 max-w-md text-center text-xs leading-relaxed text-ink/60">
        ※ 投稿後、あなたにも「拾う権利」が 1 つ追加されます。
      </p>
    </main>
  );
}
