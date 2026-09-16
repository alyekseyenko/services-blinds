import "./globals.css";
import PWARegistration from "@/components/PWARegistration";

export const viewport = {
  themeColor: "#3b82f6",
};

export const metadata = {
  title: "ESTORESRAINHA Pro",
  description: "Sistema de Gestão Técnica & Produção ESTORESRAINHA",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favi_64.png", sizes: "64x64", type: "image/png" },
      { url: "/logo-estores.png", sizes: "any", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favi_64.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ESTORESRAINHA",
  },
};

import Providers from "@/components/Providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
          <PWARegistration />
        </Providers>
      </body>
    </html>
  );
}
