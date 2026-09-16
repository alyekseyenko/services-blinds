"use client";
import { useEffect } from "react";

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

export default function PWARegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registration successful with scope: ", registration.scope);
            
            // Subscribe to push notifications
            return registration.pushManager.getSubscription()
              .then(async (subscription) => {
                if (subscription) return subscription;
                
                // If no subscription, request permission and subscribe
                const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
                return registration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: convertedVapidKey as any
                });
              });
          })
          .then(async (subscription) => {
            // Send subscription to server
            const userId = localStorage.getItem("userId");
            const userName = localStorage.getItem("userName");
            
            if (userId && subscription) {
              await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subscription,
                  userId,
                  userName
                })
              });
              console.log("Push subscription synced with server");
            }
          })
          .catch((err) => {
            console.log("Service Worker/Push registration failed: ", err);
          });
    }
  }, []);

  return null;
}
