"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

interface Props {
  onResult: (text: string) => void;
  onInterim?: (text: string) => void;
  className?: string;
}

// Voice input via the browser-native Web Speech API — zero cost, zero keys, no
// backend. Hidden on browsers that don't support it (e.g. Firefox); the text
// field still works there.
export function MicButton({ onResult, onInterim, className = "" }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  // SpeechRecognition has no DOM lib types — keep the instance loosely typed.
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    const SR =
      typeof window !== "undefined"
        ? // @ts-expect-error — vendor-prefixed, not in lib.dom
          window.webkitSpeechRecognition || window.SpeechRecognition
        : null;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "ar-KW"; // Kuwaiti Arabic; browser falls back to ar-SA when absent
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: {
      resultIndex: number;
      results: { isFinal: boolean; 0: { transcript: string } }[];
    }) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (interimText && onInterim) onInterim(interimText);
      if (finalText) {
        onResult(finalText.trim());
        setListening(false);
      }
    };
    rec.onerror = (e: { error: string }) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setPermissionDenied(true);
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    };
  }, [onResult, onInterim]);

  // Unsupported browser → hide the button; the text field carries on.
  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    try {
      recognitionRef.current?.start();
      setListening(true);
      setPermissionDenied(false);
    } catch {
      setListening(false);
    }
  };

  return (
    <div className={`flex shrink-0 flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={listening ? "إيقاف التسجيل" : "تسجيل صوتي"}
        title={listening ? "إيقاف التسجيل" : "اضغط وتكلم"}
        className={
          "relative inline-flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all " +
          (listening
            ? "scale-110 bg-[#FFD60A] text-[#0A0A0A]"
            : "bg-[#0A0A0A] text-[#FFD60A] hover:scale-105 hover:bg-[#1a1a1a]")
        }
      >
        {listening ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
        {listening && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-[#FFD60A] opacity-30" />
            <span className="absolute -inset-1 animate-pulse rounded-full border-2 border-[#FFD60A] opacity-50" />
          </>
        )}
      </button>
      {permissionDenied && (
        <p className="mt-1 max-w-[140px] text-center text-xs text-red-400">
          يرجى السماح بالميكروفون من إعدادات المتصفح
        </p>
      )}
    </div>
  );
}
