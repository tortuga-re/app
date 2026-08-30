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
    apple: [{ url: siteConfig.logoUrl }],
    icon: [
      { url: siteConfig.logoUrl, type: "image/png", sizes: "192x192" },
      { url: siteConfig.logoUrl, type: "image/png", sizes: "512x512" },
    ],
  },
  openGraph: {
    title: siteConfig.appName,
    description: siteConfig.description,
    url: siteConfig.productionUrl,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImageUrl,
        width: 1200,
        height: 630,
        alt: siteConfig.appName,
      },
    ],
    locale: "it_IT",
    type: "website",
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
      <head>
        <link rel="preconnect" href="https://menu.cooperto.it" />
        <link rel="preconnect" href="https://prenotazioni.cooperto.it" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <AnalyticsScripts />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
