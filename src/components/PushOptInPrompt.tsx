"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/Dialog";
import { getPushOptInChoice, setPushOptInChoice } from "@/lib/clientPreferences";

const VAPID_PUBLIC_KEY = "BB3RrWGNioyQIettQ0WwioDBdo84CX3XkdPj0nWSafBvc9Oq6uompwpGhOkzTx_-biso8_v30DPOEB0TvJ7fWjY";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushOptInPrompt() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const choice = getPushOptInChoice();
    if (choice !== null) {
      if (localStorage.getItem("push_opt_in") === null) {
        setPushOptInChoice(choice);
      }
      return;
    }

    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [session, status]);

  const setChoice = (value: "granted" | "denied") => {
    setPushOptInChoice(value);
    setOpen(false);
  };

  const allow = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setChoice("denied");
        return;
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        });
      }

      const user = session?.user as { id?: string; name?: string };
      if (user?.id && subscription) {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription,
            userId: user.id,
            userName: user.name || "Técnico",
          }),
        });
      }
      setChoice("granted");
    } catch {
      setChoice("denied");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => setChoice("denied")}
      title="Notificações de visitas"
      description="Receba alertas sobre alterações de rota e lembretes de visitas."
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[#84cc16]/15 p-2 text-[#84cc16]">
          <Bell className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-slate-600">
          Pode alterar esta preferência nas definições do navegador a qualquer momento.
        </p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => setChoice("denied")}>Agora não</Button>
        <Button onClick={allow}>Permitir notificações</Button>
      </div>
    </Dialog>
  );
}
