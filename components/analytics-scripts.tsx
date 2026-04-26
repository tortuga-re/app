import Script from "next/script";

import { analyticsConfig, siteConfig } from "@/lib/config";

export function AnalyticsScripts() {
  if (!analyticsConfig.gtmId) {
    return null;
  }

  const bootstrapPayload = JSON.stringify({
    event: "app_bootstrap",
    site_area: analyticsConfig.siteArea,
    app_name: siteConfig.appName,
    app_domain: analyticsConfig.appDomain,
    app_section: "app",
    event_source: analyticsConfig.eventSource,
    meta_pixel_id: analyticsConfig.metaPixelId,
  });
  const gtmId = JSON.stringify(analyticsConfig.gtmId);
  const siteArea = JSON.stringify(analyticsConfig.siteArea);
  const appDomain = JSON.stringify(analyticsConfig.appDomain);

  return (
    <>
      <Script
        id="tortuga-gtm"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push(${bootstrapPayload});
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js',site_area:${siteArea},app_domain:${appDomain}});
            var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer',${gtmId});
          `,
        }}
      />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${analyticsConfig.gtmId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
