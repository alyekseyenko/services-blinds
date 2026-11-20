"use client";

import { useEffect, useState } from "react";

let open = false;
const listeners = new Set<(value: boolean) => void>();

export function setMapStreetViewOpen(next: boolean) {
  if (open === next) return;
  open = next;
  listeners.forEach((listener) => listener(next));
}

export function useMapStreetViewOpen(): boolean {
  const [value, setValue] = useState(open);
  useEffect(() => {
    listeners.add(setValue);
    setValue(open);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}
