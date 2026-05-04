// =============================================================================
// Carga de fuentes para next/og — DM Serif Display + DM Sans (varios pesos)
// =============================================================================
// next/og corre en Edge Runtime y necesita los archivos de fuente como
// ArrayBuffer. Los descargamos desde fonts.gstatic.com en cada request (Vercel
// los cachea en CDN, así que el costo real es bajo después del primer hit).
// =============================================================================

const URLS = {
  serif400:
    "https://cdn.jsdelivr.net/fontsource/fonts/dm-serif-display@latest/latin-400-normal.ttf",
  serif400italic:
    "https://cdn.jsdelivr.net/fontsource/fonts/dm-serif-display@latest/latin-400-italic.ttf",
  sans300:
    "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-300-normal.ttf",
  sans400:
    "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-400-normal.ttf",
  sans500:
    "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-500-normal.ttf",
  sans600:
    "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-600-normal.ttf",
};

let cache: Awaited<ReturnType<typeof loadFontsImpl>> | null = null;

async function loadFontsImpl() {
  const entries = await Promise.all(
    Object.entries(URLS).map(async ([key, url]) => {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) {
        throw new Error(`No pude cargar la fuente ${key} desde ${url}`);
      }
      const data = await res.arrayBuffer();
      return [key, data] as const;
    })
  );
  return Object.fromEntries(entries) as Record<keyof typeof URLS, ArrayBuffer>;
}

export async function loadFonts() {
  if (!cache) cache = await loadFontsImpl();
  return cache;
}

/** Lista en formato esperado por ImageResponse `fonts` option. */
export async function imageResponseFonts() {
  const f = await loadFonts();
  return [
    { name: "DM Serif Display", data: f.serif400, weight: 400 as const, style: "normal" as const },
    { name: "DM Serif Display", data: f.serif400italic, weight: 400 as const, style: "italic" as const },
    { name: "DM Sans", data: f.sans300, weight: 300 as const, style: "normal" as const },
    { name: "DM Sans", data: f.sans400, weight: 400 as const, style: "normal" as const },
    { name: "DM Sans", data: f.sans500, weight: 500 as const, style: "normal" as const },
    { name: "DM Sans", data: f.sans600, weight: 600 as const, style: "normal" as const },
  ];
}
