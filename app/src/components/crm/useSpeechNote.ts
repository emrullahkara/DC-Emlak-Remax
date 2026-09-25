"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Web Speech API'nin kullandığımız kadarlık tipi (tarayıcı tiplerinde standart değil) */
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => RecognitionLike;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const HATA: Record<string, string> = {
  "not-allowed": "Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verin.",
  "service-not-allowed": "Konuşma tanıma bu tarayıcıda kapalı.",
  "no-speech": "Ses algılanmadı, tekrar deneyin.",
  network: "Konuşma tanıma için internet bağlantısı gerekli.",
  "audio-capture": "Mikrofon bulunamadı.",
};

/**
 * Sesle not: tr-TR konuşma tanıma. Desteklenmiyorsa `supported=false` döner;
 * arayüz klavye dikte önerisiyle yazıya geri düşer.
 */
export function useSpeechNote(onText: (text: string) => void) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<RecognitionLike | null>(null);
  const cb = useRef(onText);
  useEffect(() => {
    cb.current = onText;
  }, [onText]);

  useEffect(() => {
    // Tarayıcı özelliği yalnızca istemcide bilinebilir
    const t = setTimeout(() => setSupported(getCtor() !== null), 0);
    return () => {
      clearTimeout(t);
      rec.current?.stop();
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setError(null);
    const r = new Ctor();
    r.lang = "tr-TR";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) text += res[0]!.transcript;
      }
      if (text.trim()) cb.current(text.trim());
    };
    r.onerror = (e) => setError(HATA[e.error] ?? `Konuşma tanıma hatası: ${e.error}`);
    r.onend = () => setListening(false);
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setError("Konuşma tanıma başlatılamadı.");
    }
  }, []);

  const stop = useCallback(() => {
    rec.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, error, start, stop };
}
