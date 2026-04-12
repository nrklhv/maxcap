# Prompt para Cursor — MaxRent Landing

> Pega este prompt completo en Cursor al abrir el proyecto.
> Adjunta también los archivos `inversionista.html`, `vendedor.html` y `BRIEF.md`.

---

## Prompt

Quiero que construyas un sitio web en **Next.js 14 (App Router) + Tailwind CSS + TypeScript** basándote en los archivos HTML de referencia adjuntos (`inversionista.html` y `vendedor.html`) y en el `BRIEF.md`.

### Lo que debes hacer

1. **Inicializar el proyecto** con la siguiente estructura:

```
maxrent/
├── app/
│   ├── layout.tsx          # fuentes DM Serif Display + DM Sans, metadata
│   ├── page.tsx            # página inversionista
│   └── vendedor/
│       └── page.tsx        # página vendedor
├── components/
│   ├── Logo.tsx
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── FormInversionista.tsx
│   ├── FormVendedor.tsx
│   ├── PilarCard.tsx
│   ├── FaqItem.tsx
│   ├── StepRow.tsx
│   ├── Calculadora.tsx
│   └── CapRateCard.tsx
├── tailwind.config.ts      # con colores custom del brief
└── BRIEF.md
```

2. **Colores en Tailwind** — agregar en `tailwind.config.ts`:

```ts
colors: {
  dark: '#001F30',
  orange: { DEFAULT: '#FF6701', 2: '#FF8C3A', light: '#FFF0E6' },
  cream: '#FBF7F3',
  gray: { 1: '#EDE7E0', 2: '#C4B8AE', 3: '#7A6E68' },
  teal: { DEFAULT: '#0F6E56', light: '#D4EDE7', 2: '#5DCAA5' },
}
```

3. **Fuentes** en `app/layout.tsx` via `next/font/google`:
```ts
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
```

4. **Replicar fielmente el diseño** de los HTML adjuntos, con estas mejoras mobile:

### Reglas mobile (< 768px)

- **Header**: hamburger menu que despliega nav en overlay oscuro
- **Layout**: eliminar el `margin-right: 420px` — pasar a columna única
- **Formulario sticky**: en mobile va como sección fija al fondo de la pantalla (botón "Reservar" que abre un drawer/sheet), O como sección normal al final del contenido — elige la opción más limpia
- **Grillas 2×2**: `grid-cols-1` en mobile, `grid-cols-2` en `md:`
- **Grillas de 3 col**: `grid-cols-1` en mobile, `grid-cols-3` en `lg:`
- **Tabla comparativa**: scroll horizontal en mobile (`overflow-x-auto`)
- **Hero**: usar `text-4xl md:text-6xl` con Tailwind responsive en lugar de `clamp()`
- **Banda de cupos**: flex-wrap en mobile, items apilados
- **Pasos (cómo funciona)**: la línea vertical conectora se mantiene en mobile

### Componentes con lógica

**`FormInversionista.tsx`** — React state:
- Estado `submitted: boolean`
- Si submitted → mostrar pantalla success con checkmark verde
- Contador de cupos: empieza en 77, baja 1 cada 25-60s (setTimeout random), mínimo 58

**`FormVendedor.tsx`** — igual pero con campos extra de propiedad y color teal

**`FaqItem.tsx`** — accordion con useState para open/close

**`Calculadora.tsx`** (solo en `/vendedor`):
- Input: número (arriendo mensual en CLP)
- Calcula precio = (arriendo × 12) / cap_rate para 4.5%, 5%, 5.5%, 6%
- Formatea en pesos ($106,7M) y UF (÷ 38.000)
- Muestra 4 CapRateCards, la de 5% destacada como "recomendada"

### Logo SVG

Usar este SVG inline como componente `Logo.tsx` con prop `size: 'sm' | 'md' | 'lg'`:

```tsx
// size sm → header (140×30)
// size md → footer (160×34)  
// size lg → hero (200×44)

const sizes = {
  sm: { w: 140, h: 30 },
  md: { w: 160, h: 34 },
  lg: { w: 200, h: 44 },
}
// Chevron izquierdo: stroke #4A6B8A
// Chevron derecho: stroke #CC4A28
// Texto MAXRENT: fill #EDE0CC, font-weight 300, letter-spacing amplio
```

### Lo que NO debes hacer

- No conectar formularios a ningún backend (solo UI por ahora)
- No agregar autenticación
- No agregar CMS
- No instalar librerías de animación (usar CSS transitions nativas de Tailwind)
- No usar `pages/` router — solo App Router

### Orden de construcción sugerido

1. `tailwind.config.ts` con colores
2. `app/layout.tsx` con fuentes y metadata
3. `components/Logo.tsx`
4. `components/Header.tsx` (con hamburger mobile)
5. `components/Footer.tsx`
6. `app/page.tsx` con todas las secciones de inversionista
7. `components/FormInversionista.tsx` con lógica de cupos
8. `app/vendedor/page.tsx`
9. `components/Calculadora.tsx`
10. `components/FormVendedor.tsx`

### Para arrancar

```bash
npx create-next-app@latest maxrent \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd maxrent
npm run dev
```

El sitio debe verse idéntico al HTML de referencia en desktop y estar 100% funcional en mobile desde el primer build.
