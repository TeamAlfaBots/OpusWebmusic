'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type RecognitionResult = { 0: { transcript: string }; isFinal: boolean };
type RecognitionEvent = { results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null; onend: (() => void) | null; onerror: (() => void) | null;
  start: () => void; stop: () => void;
};

const LANG_TAGS: Record<string, string> = { Hindi: 'hi-IN', Punjabi: 'pa-IN', English: 'en-IN', Tamil: 'ta-IN', Telugu: 'te-IN', Bengali: 'bn-IN', Marathi: 'mr-IN', Gujarati: 'gu-IN' };

/** Voice search through the browser's speech recognition (Chrome / Edge / Safari). */
export function useVoiceSearch(language: string) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => rec.current?.stop();
  }, []);

  const listen = useCallback((onText: (text: string) => void) => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    if (rec.current) { rec.current.stop(); rec.current = null; }
    const r = new Ctor();
    r.lang = LANG_TAGS[language] ?? 'en-IN';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => { const t = e.results[0]?.[0]?.transcript; if (t) onText(t.trim()); };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    try { r.start(); } catch { setListening(false); }
  }, [language]);

  return { supported, listening, listen };
}
