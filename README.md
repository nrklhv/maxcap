# MaxRent — monorepo

Repo con tres apps Next.js:

| App | Carpeta | Dominio | Puerto dev |
|---|---|---|---|
| Landing pública | `/` (raíz) | `www.maxrent.cl` | 3000 |
| Portal | `maxrent-portal/` | `portal.maxrent.cl` | 3002 |
| Recursos de marca | `maxrent-marketing/` | `marketing.maxrent.cl` | 3003 |

Cada app es independiente (su propio `package.json`, build y deploy en Vercel) pero comparten convenciones (Next 14, App Router, Tailwind 3, DM Sans + DM Serif Display).

## Setup rápido

```bash
# Landing
npm install
npm run dev                    # → :3000

# Portal
cd maxrent-portal
npm install && npm run dev     # → :3002

# Recursos de marca
cd maxrent-marketing
npm install && npm run dev     # → :3003
```

Cada app tiene su `.env.example`. La landing y el portal comparten DB Neon; ver [`maxrent-portal/SETUP.md`](maxrent-portal/SETUP.md) para detalle. La app de marketing no tiene DB.

## Documentación
- [`BRIEF.md`](BRIEF.md) — brief de producto y branding
- [`maxrent-portal/CONTEXTO-PROYECTO.md`](maxrent-portal/CONTEXTO-PROYECTO.md) — contexto técnico del portal
- [`maxrent-portal/SETUP.md`](maxrent-portal/SETUP.md) — setup detallado del portal
- [`maxrent-marketing/README.md`](maxrent-marketing/README.md) — setup y manejo de recursos de marca

## Deploy
Tres proyectos Vercel independientes apuntando al mismo repo:
- Landing: root del repo
- Portal: root directory `maxrent-portal/`
- Marketing: root directory `maxrent-marketing/`
