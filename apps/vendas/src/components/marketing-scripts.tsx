import Script from "next/script";

import { db, eq, marketingSettingsTable } from "@/lib/db";

interface MarketingScriptsProps {
  restaurantId: string;
}

const META_PIXEL_REGEX = /^\d{4,25}$/;
const GTM_REGEX = /^GTM-[A-Z0-9]+$/i;
const GA4_REGEX = /^(G|UA)-[A-Z0-9-]+$/i;

export async function MarketingScripts({ restaurantId }: MarketingScriptsProps) {
  const settings = await db.query.marketingSettingsTable.findFirst({
    where: eq(marketingSettingsTable.restaurantId, restaurantId),
  });

  if (!settings) return null;

  const validPixelId = settings.metaPixelId && META_PIXEL_REGEX.test(settings.metaPixelId) ? settings.metaPixelId : null;
  const validGtmId = settings.gtmContainerId && GTM_REGEX.test(settings.gtmContainerId) ? settings.gtmContainerId : null;
  const validGa4Id = settings.ga4MeasurementId && GA4_REGEX.test(settings.ga4MeasurementId) ? settings.ga4MeasurementId : null;

  return (
    <>
      {/* Meta Pixel */}
      {validPixelId && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">{`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${validPixelId}');
            fbq('track', 'PageView');
          `}</Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(validPixelId)}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* Google Tag Manager */}
      {validGtmId && (
        <>
          <Script id="gtm" strategy="afterInteractive">{`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${validGtmId}');
          `}</Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(validGtmId)}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      )}

      {/* Google Analytics 4 */}
      {validGa4Id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(validGa4Id)}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${validGa4Id}');
          `}</Script>
        </>
      )}
    </>
  );
}
