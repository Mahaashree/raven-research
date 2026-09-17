"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { MascotPose } from "./Mascot";

interface MascotContextValue {
  pose: MascotPose;
  setLoading: () => void;
  flashSuccess: () => void;
  reset: () => void;
}

const MascotContext = createContext<MascotContextValue | null>(null);

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const [pose, setPose] = useState<MascotPose>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setLoading = useCallback(() => {
    clearPending();
    setPose("loading");
  }, [clearPending]);

  const flashSuccess = useCallback(() => {
    clearPending();
    setPose("success");
    timeoutRef.current = setTimeout(() => setPose("idle"), 900);
  }, [clearPending]);

  const reset = useCallback(() => {
    clearPending();
    setPose("idle");
  }, [clearPending]);

  return (
    <MascotContext.Provider value={{ pose, setLoading, flashSuccess, reset }}>
      {children}
    </MascotContext.Provider>
  );
}

export function useMascot() {
  const ctx = useContext(MascotContext);
  if (!ctx) throw new Error("useMascot must be used within MascotProvider");
  return ctx;
}
