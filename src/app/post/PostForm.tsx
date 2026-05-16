"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { createBottle, type CreateBottleState } from "@/lib/actions";
import { getOrCreateDeviceId } from "@/lib/device-id";

const initialState: CreateBottleState = { ok: false };

export function PostForm() {
  const [deviceId, setDeviceId] = useState("");
  const [state, formAction, pending] = useActionState(createBottle, initialState);

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());
  }, []);

  return (
    <form action={formAction} className="w-full max-w-md flex flex-col gap-5">
      <input type="hidden" name="device_id" value={deviceId} />

      <label className="flex flex-col gap-2">
        <span className="text-sm tracking-widest text-ink/80">YouTube リンク</span>
        <input
          type="url"
          name="youtube_url"
          required
          inputMode="url"
          autoComplete="off"
          placeholder="https://youtu.be/..."
          className="w-full rounded-2xl border border-ink/15 bg-sand/80 px-4 py-3 text-ink shadow-inner outline-none focus:border-ribbon/60 focus:bg-sand"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm tracking-widest text-ink/80">一言（140 文字まで）</span>
        <textarea
          name="comment"
          required
          maxLength={140}
          rows={4}
          placeholder="この曲、夕方に聴くといいよ"
          className="w-full resize-none rounded-2xl border border-ink/15 bg-sand/80 px-4 py-3 text-ink shadow-inner outline-none focus:border-ribbon/60 focus:bg-sand"
        />
      </label>

      {state.error && (
        <p
          aria-live="polite"
          className="rounded-xl bg-ribbon/15 px-4 py-2 text-sm text-ribbon"
        >
          🍶 {state.error}
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-ink/70 underline-offset-4 hover:underline">
          ← 海にもどる
        </Link>
        <button
          type="submit"
          disabled={pending || !deviceId}
          className="rounded-full bg-ribbon px-6 py-3 text-sm font-semibold tracking-widest text-sand shadow-md transition disabled:cursor-wait disabled:opacity-50 hover:bg-ribbon/90"
        >
          {pending ? "流しています…" : "🌊 海に流す"}
        </button>
      </div>
    </form>
  );
}
