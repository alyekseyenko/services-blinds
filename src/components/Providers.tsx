"use client";

import dynamic from "next/dynamic";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/ToastContext";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { AppColorTheme } from "@/lib/theme/colorTheme";

const OnboardingTour = dynamic(() => import("@/components/onboarding/OnboardingTour"), {
  ssr: false,
});

const TourChapterPickerHost = dynamic(
  () => import("@/components/onboarding/TourChapterPickerHost"),
  { ssr: false }
);

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
            {children}
            <OnboardingTour />
            <TourChapterPickerHost />
          </ConfirmProvider>
        </ToastProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
