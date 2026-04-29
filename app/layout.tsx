import type { Metadata, Viewport } from "next";

import "./globals.css";

import { AnalyticsScripts } from "@/components/analytics-scripts";
import { AppShell } from "@/components/app-shell";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.productionUrl),
  title: {
    default: siteConfig.appName,
    template: `%s | ${siteConfig.appName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.appName,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteConfig.appName,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    apple: [{ url: "/pwa-icon/192" }],
    icon: [
      { url: "/pwa-icon/192", type: "image/png", sizes: "192x192" },
      { url: "/pwa-icon/512", type: "image/png", sizes: "512x512" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: siteConfig.accent,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <AnalyticsScripts />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
