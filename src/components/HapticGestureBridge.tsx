"use client";

import { useEffect } from "react";
import { installHapticGestureBridge } from "@/lib/haptics";

/** Liga rastreio de gestos para vibração após operações async (medições, estados). */
export default function HapticGestureBridge() {
  useEffect(() => installHapticGestureBridge(), []);
  return null;
}
