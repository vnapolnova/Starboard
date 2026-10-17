import { useEffect, useRef, useState } from 'preact/hooks';
import { toast } from '../ui/toast-store';

// The tablet mic (spec §9): one phrase through the Web Speech API, with the
// mockup's "Listening…" and "Didn't catch that" toasts. The caller gets the
// transcript; parsing it is parseVoice in src/data/grocery.ts.

interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as Record<string, RecognitionCtor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const NOT_CAUGHT = "Didn't catch that. Tap the mic and try again.";

/** `listen()` starts one phrase; `heard` gets its transcript. */
export function useVoice(heard: (transcript: string) => void) {
  const [listening, setListening] = useState(false);
  const current = useRef<Recognition | null>(null);
  const onHeard = useRef(heard);
  onHeard.current = heard;

  useEffect(() => () => current.current?.abort(), []);

  function listen() {
    if (current.current) return current.current.abort(); // a second tap stops it
    const Ctor = recognitionCtor();
    if (!Ctor) return toast("Voice isn't available in this browser. Type the item instead.");
    try {
      const r = new Ctor();
      r.lang = navigator.language || 'en-US';
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.onresult = (e) => {
        const said = e.results[0]?.[0]?.transcript ?? '';
        onHeard.current(said);
      };
      r.onerror = (e) => {
        if (e.error === 'aborted') return;
        toast(
          e.error === 'not-allowed' || e.error === 'service-not-allowed'
            ? "The mic isn't allowed here. Type the item instead."
            : NOT_CAUGHT,
        );
      };
      r.onend = () => {
        current.current = null;
        setListening(false);
      };
      r.start();
      current.current = r;
      setListening(true);
      toast('Listening…');
    } catch (e) {
      console.error('Speech recognition failed to start', e);
      current.current = null;
      setListening(false);
      toast("Voice isn't available here.");
    }
  }

  return { listening, listen };
}
