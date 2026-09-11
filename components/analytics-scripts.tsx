"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import { analyticsConfig } from "@/lib/config";

export function AnalyticsScripts() {
  const [ready, setReady] = useState(false);
  const ga4Id = analyticsConfig.ga4Id;
  const pixelId = analyticsConfig.metaPixelId;

  useEffect(() => {
    const enable = () => setReady(true);
    const timer = window.setTimeout(enable, 12_000);
    window.addEventListener("pointerdown", enable, { once: true, passive: true });
    window.addEventListener("keydown", enable, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", enable);
      window.removeEventListener("keydown", enable);
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      {/* Google Analytics 4 (GA4) */}
      {ga4Id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script
            id="tortuga-ga4"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', ${JSON.stringify(ga4Id)}, {
                  page_path: window.location.pathname,
                });
              `,
            }}
          />
        </>
      ) : null}

      {/* Meta Pixel */}
      {pixelId ? (
        <>
          <Script
            id="tortuga-meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', ${JSON.stringify(pixelId)});
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      ) : null}
    </>
  );
}
