import Script from "next/script";

import { analyticsConfig, siteConfig } from "@/lib/config";

export function AnalyticsScripts() {
  const gtmId = analyticsConfig.gtmId;
  const ga4Id = analyticsConfig.ga4Id;
  const pixelId = analyticsConfig.metaPixelId;

  const bootstrapPayload = JSON.stringify({
    event: "app_bootstrap",
    site_area: analyticsConfig.siteArea,
    app_name: siteConfig.appName,
    app_domain: analyticsConfig.appDomain,
    app_section: "app",
    event_source: analyticsConfig.eventSource,
    meta_pixel_id: pixelId,
    ga4_id: ga4Id,
  });

  return (
    <>
      {/* Google Tag Manager (GTM) */}
      {gtmId ? (
        <>
          <Script
            id="tortuga-gtm"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push(${bootstrapPayload});
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});
                var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer',${JSON.stringify(gtmId)});
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        </>
      ) : null}

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
