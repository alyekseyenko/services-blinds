"use client";

import { useEffect } from "react";
import { dispatchPushOptInResolved } from "@/lib/onboarding/pushBeforeTour";

/**
 * Push do sistema (n8n / web-push) não é usado — avisos via sininho na app.
 * Resolve o onboarding sem diálogo nem chamadas a /api/push/subscribe.
 */
export default function PushOptInPrompt() {
  useEffect(() => {
    dispatchPushOptInResolved();
  }, []);

  return null;
}
