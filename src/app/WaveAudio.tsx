"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 波の音を Web Audio API で合成する。
 *  - ホワイトノイズ
 *  - 海らしいこもり感を出すローパス（~600Hz）
 *  - 低周波の生活雑音をカットするハイパス（~80Hz）
 *  - 0.13Hz の sin LFO で振幅を揺らして「寄せては引く」うねりを作る
 *  - マスターゲインで 1 秒かけてフェードイン / アウト
 * 外部音源なし。ライセンス問題なし。ファイルサイズ増もなし。
 */
export function WaveAudio() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<{ noise: AudioBufferSourceNode; lfo: OscillatorNode } | null>(null);
  const masterRef = useRef<GainNode | null>(null);

  const stop = useCallback(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    const sources = sourcesRef.current;
    if (!ctx || !master || !sources) return;

    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.6);

    // フェード後にクローズ
    window.setTimeout(() => {
      try {
        sources.noise.stop();
      } catch {}
      try {
        sources.lfo.stop();
      } catch {}
      ctx.close().catch(() => {});
      ctxRef.current = null;
      sourcesRef.current = null;
      masterRef.current = null;
    }, 700);
  }, []);

  const start = useCallback(() => {
    if (ctxRef.current) return;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();

    // ホワイトノイズ
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    // ハイパス → ローパスでスペクトルを成形
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 80;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 600;
    lp.Q.value = 0.5;

    // 振幅変調用 LFO（約 8 秒で 1 周期）
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.13;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.35;

    const swell = ctx.createGain();
    swell.gain.value = 0.5;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 1.0);

    // 信号経路
    noise.connect(hp);
    hp.connect(lp);
    lp.connect(swell);
    swell.connect(master);
    master.connect(ctx.destination);

    // LFO → swell.gain を変調
    lfo.connect(lfoDepth);
    lfoDepth.connect(swell.gain);

    noise.start();
    lfo.start();

    ctxRef.current = ctx;
    sourcesRef.current = { noise, lfo };
    masterRef.current = master;
  }, []);

  useEffect(() => {
    return () => {
      // アンマウント時のクリーンアップ
      const ctx = ctxRef.current;
      const sources = sourcesRef.current;
      try {
        sources?.noise.stop();
      } catch {}
      try {
        sources?.lfo.stop();
      } catch {}
      ctx?.close().catch(() => {});
    };
  }, []);

  function toggle() {
    if (on) {
      stop();
      setOn(false);
    } else {
      start();
      setOn(true);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "波の音をオフ" : "波の音をオン"}
      title={on ? "波の音をオフ" : "波の音をオン"}
      className="pointer-events-auto rounded-full bg-sand/85 px-3 py-2 text-base shadow-md backdrop-blur transition hover:bg-sand"
    >
      {on ? "🔊" : "🔈"}
    </button>
  );
}
