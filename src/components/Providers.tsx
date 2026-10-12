"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/ToastContext";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { AppColorTheme } from "@/lib/theme/colorTheme";
import HapticGestureBridge from "@/components/HapticGestureBridge";
import RouteNavigationOverlay from "@/components/ui/RouteNavigationOverlay";

type ProvidersProps = {
  children: React.ReactNode;
  initialTheme?: AppColorTheme;
};

export default function Providers({ children, initialTheme = "light" }: ProvidersProps) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <SessionProvider refetchOnWindowFocus refetchInterval={5 * 60}>
        <ToastProvider>
          <ConfirmProvider>
            <HapticGestureBridge />
            <RouteNavigationOverlay />
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
