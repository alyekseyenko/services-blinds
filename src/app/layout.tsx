import "./globals.css";
import PWARegistration from "@/components/PWARegistration";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PushOptInPrompt from "@/components/PushOptInPrompt";
import SWUpdatePrompt from "@/components/SWUpdatePrompt";
import { APP_NAME, APP_SHORT_NAME, APP_LOGO_PATH } from "@/lib/branding";
import Providers from "@/components/Providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme/themeInitScript";

export const viewport = {
  themeColor: "#84cc16",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export const metadata = {
  title: APP_NAME,
  description: `Field operations platform — ${APP_NAME}`,
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <Providers>
          {children}
          <PWARegistration />
          <PWAInstallPrompt />
          <PushOptInPrompt />
          <SWUpdatePrompt />
        </Providers>
      </body>
    </html>
  );
}
