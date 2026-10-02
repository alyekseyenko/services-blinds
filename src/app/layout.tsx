import "./globals.css";
import { cookies } from "next/headers";
import PWARegistration from "@/components/PWARegistration";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PushOptInPrompt from "@/components/PushOptInPrompt";
import AppUpdatePrompt from "@/components/AppUpdatePrompt";
import { APP_NAME, APP_SHORT_NAME, APP_LOGO_PATH } from "@/lib/branding";
import Providers from "@/components/Providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme/themeInitScript";
import {
  COLOR_THEME_STORAGE_KEY,
  type AppColorTheme,
} from "@/lib/theme/colorTheme";
export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ebebe8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  interactiveWidget: "resizes-content" as const,
};

export const metadata = {
  title: APP_NAME,
  description: `Plataforma de operações em campo — ${APP_NAME}`,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: APP_LOGO_PATH, sizes: "64x64", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: APP_LOGO_PATH,
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_SHORT_NAME,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(COLOR_THEME_STORAGE_KEY)?.value;
  const initialTheme: AppColorTheme =
    themeCookie === "dark" || themeCookie === "light" ? themeCookie : "light";

  return (
    <html lang="pt" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className="min-h-full flex flex-col bg-background font-sans text-foreground"
        suppressHydrationWarning
      >
        <Providers initialTheme={initialTheme}>
          {children}
          <PWARegistration />
          <PWAInstallPrompt />
          <PushOptInPrompt />
          <AppUpdatePrompt />
        </Providers>
      </body>
    </html>
  );
}
