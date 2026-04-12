export function siteWideJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "MaxRent",
        url: siteUrl,
        logo: `${siteUrl}/icon.svg`,
        description: "Inversión y venta de propiedades usadas en Chile.",
      },
      {
        "@type": "WebSite",
        name: "MaxRent",
        url: siteUrl,
      },
    ],
  };
}
