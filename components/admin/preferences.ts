"use client";
import { useEffect, useState } from "react";
// Administration children mount after the account-scoped preferences are loaded.
export function useRememberedValue<T extends string>(
  key: string,
  initial: T,
  override = false,
) {
  const [value, setValue] = useState<T>(() => {
    if (override || typeof window === "undefined") return initial;
    try {
      return (localStorage.getItem(key) as T) ?? initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}
