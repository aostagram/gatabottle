"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 波の音を Web Audio API で合成する。
 *  - ホワイトノイズ（5秒 buffer ループ）を音源に
 *  - ハイパス 100Hz で低域の生活雑音を除去
 *  - ローパス 350Hz × 2段で高域の「ザー」感を強く削り、海らしいこもりに
 *  - LFO 2本（0.08Hz の大うねり + 0.23Hz の小うねり）で不規則なうねりを作る
 *  - 振幅は深め（base 0.25 を中心に大うねり ±0.45 / 小うねり ±0.18）
 *  - マスターゲインで 1 秒フェードイン / 0.6 秒フェードアウト
 * 外部音源なし。ライセンス問題なし。ファイルサイズ増もなし。
 */
export function WaveAudio() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<{
    noise: AudioBufferSourceNode;
    lfo1: OscillatorNode;
    lfo2: OscillatorNode;
  } | null>(null);
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
        sources.lfo1.stop();
      } catch {}
      try {
        sources.lfo2.stop();
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

    // ホワイトノイズ（5秒）
    const bufferSize = 5 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    // 低域の生活雑音をカット
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 100;

    // ローパスを 2 段重ねて高域を強く削る（350Hz × 2 で -24dB/oct）
    const lp1 = ctx.createBiquadFilter();
    lp1.type = "lowpass";
    lp1.frequency.value = 350;
    lp1.Q.value = 1.0;

    const lp2 = ctx.createBiquadFilter();
    lp2.type = "lowpass";
    lp2.frequency.value = 350;
    lp2.Q.value = 0.7;

    // 大うねり（約 12 秒で 1 周期）
    const lfo1 = ctx.createOscillator();
    lfo1.type = "sine";
    lfo1.frequency.value = 0.08;
    const lfo1Depth = ctx.createGain();
    lfo1Depth.gain.value = 0.45;

    // 小うねり（約 4.3 秒で 1 周期、互いに非整数倍にして繰り返し感を消す）
    const lfo2 = ctx.createOscillator();
    lfo2.type = "sine";
    lfo2.frequency.value = 0.23;
    const lfo2Depth = ctx.createGain();
    lfo2Depth.gain.value = 0.18;

    // ベースゲインを浅めにして、LFO の引きを強調
    const swell = ctx.createGain();
    swell.gain.value = 0.25;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 1.0);

    // 信号経路: noise → HP → LP × 2 → swell → master → out
    noise.connect(hp);
    hp.connect(lp1);
    lp1.connect(lp2);
    lp2.connect(swell);
    swell.connect(master);
    master.connect(ctx.destination);

    // LFO 1, 2 が swell.gain に加算的に変調
    lfo1.connect(lfo1Depth);
    lfo1Depth.connect(swell.gain);
    lfo2.connect(lfo2Depth);
    lfo2Depth.connect(swell.gain);

    noise.start();
    lfo1.start();
    lfo2.start();

    ctxRef.current = ctx;
    sourcesRef.current = { noise, lfo1, lfo2 };
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
        sources?.lfo1.stop();
      } catch {}
      try {
        sources?.lfo2.stop();
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
