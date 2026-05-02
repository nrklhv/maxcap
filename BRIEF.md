# MaxRent — Brief de Proyecto

## Descripción del producto

MaxRent es una plataforma de inversión inmobiliaria en propiedades usadas en Chile.
Conecta tres actores: **vendedores** de propiedades (ya arrendadas), **inversionistas**
que compran sin poner pie, y el ecosistema **Houm + Banco Aliado + Renta Capital** que hace
posible el modelo financiero.

El sitio tiene **dos páginas**:
- `/` → Vista inversionista (página principal)
- `/vendedor` → Vista vendedor de propiedad

---

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS**
- **TypeScript**
- Fuentes: `DM Serif Display` (italic, headers) + `DM Sans` (body) via Google Fonts

---

## Paleta de colores

```css
--dark:    #001F30   /* fondo hero y secciones oscuras */
--orange:  #FF6701   /* color principal de acción */
--orange2: #FF8C3A   /* orange suave */
--orangeL: #FFF0E6   /* orange muy claro, fondos */
--cream:   #FBF7F3   /* fondo general */
--white:   #FFFFFF
--gray1:   #EDE7E0   /* bordes suaves */
--gray2:   #C4B8AE   /* texto secundario claro */
--gray3:   #7A6E68   /* texto secundario */
--green:   #0F6E56   /* éxito, teal oscuro */
--greenL:  #D4EDE7   /* teal claro */
--teal2:   #5DCAA5   /* teal brillante (página vendedor) */
```

En Tailwind, definir estas variables en `tailwind.config.ts` bajo `theme.extend.colors`.

---

## Logo

SVG inline. Dos chevrones `<<` + texto `MAXRENT`:
- Chevron izquierdo (atrás): `#4A6B8A` (azul slate)
- Chevron derecho (adelante): `#CC4A28` (naranja quemado)
- Texto MAXRENT: `#EDE0CC` (crema), font-weight 300, letter-spacing amplio
- Tipografía del texto: `DM Sans` o `system-ui`

Tamaños:
- Header: 140×30px
- Hero: 200×44px
- Footer: 160×34px

```svg
<!-- Ejemplo header 140x30 -->
<svg width="140" height="30" viewBox="0 0 140 30" fill="none">
  <polyline points="16.3,3.6 2.8,15.0 16.3,26.4"
    stroke="#4A6B8A" stroke-width="3.0" stroke-linecap="square" fill="none"/>
  <polyline points="27.5,3.6 14.0,15.0 27.5,26.4"
    stroke="#CC4A28" stroke-width="3.0" stroke-linecap="square" fill="none"/>
  <text x="46.2" y="21.6"
    font-family="'DM Sans',system-ui,sans-serif"
    font-size="15.6" font-weight="300" letter-spacing="2.4"
    fill="#EDE0CC">MAXRENT</text>
</svg>
```

---

## Estructura de páginas

### `/` — Página Inversionista

**Layout en desktop:** contenido izquierdo + formulario sticky derecho (420px fijo)
**Layout en mobile:** columna única, formulario arriba o abajo (decidir en iteración)

#### Secciones (en orden):
1. **Header sticky** — logo + nav links + CTA "Reservar cupo"
2. **Hero** — fondo `--dark`, headline principal, badge de cupos
3. **Banda de urgencia** — contador de cupos disponibles (77/100), barra de progreso
4. **Pilares 2×2** — 4 cards con los diferenciadores del modelo
5. **Usada vs Nueva** — tabla comparativa + insights
6. **Alianza** — cards de Houm, Renta Capital y Banco Aliado
7. **Cómo funciona** — 6 pasos con línea conectora vertical
8. **FAQ** — accordion
9. **Footer**

**Formulario sticky (desktop):**
- Campos: Nombre, Apellido, Email, WhatsApp
- CTA: "Reservar mi cupo →"
- Estado success al enviar

---

### `/vendedor` — Página Vendedor

**Layout:** igual al inversionista (contenido + formulario sticky)
**Acento de color:** `--teal` (`#0F6E56`) en lugar de `--orange`

#### Secciones:
1. **Header sticky** — mismo logo, nav distinto
2. **Hero** — "Le damos liquidez a tu propiedad"
3. **Requisitos** — 4 cards (administrada por Houm, arrendada, cap rate ≥4.5%, pie en cuotas)
4. **Por qué lo logramos** — 3 stats (Renta Capital, Houm, Banco Aliado)
5. **Calculadora de valor** — input arriendo → calcula precio según cap rate (4.5%, 5%, 5.5%, 6%)
6. **FAQ** — accordion
7. **Footer**

**Formulario sticky vendedor:**
- Campos: Nombre, Apellido, Email, WhatsApp; cantidad de propiedades en venta; ¿están arrendadas?; ¿bajo administración Houm?
- CTA: "Enviar datos →"

---

## Comportamiento mobile (breakpoint < 768px)

- El formulario sticky pasa a ser una sección normal al final del contenido
- El header colapsa a hamburger menu
- Las grillas 2×2 y 3 columnas pasan a 1 columna
- La tabla comparativa hace scroll horizontal o se rediseña en cards
- El hero reduce padding y font-size (ya usa `clamp()` en el original)
- La banda de cupos se apila verticalmente

---

## Componentes a crear

```
components/
  Logo.tsx              # SVG logo reutilizable con prop `size`
  Header.tsx            # sticky, con nav y variante inversionista/vendedor
  Footer.tsx            # compartido entre páginas
  FormInversionista.tsx # formulario con estado success
  FormVendedor.tsx      # formulario extendido con datos de propiedad
  PilarCard.tsx         # card reutilizable para pilares y requisitos
  FaqItem.tsx           # accordion item
  StepRow.tsx           # paso del proceso con círculo y línea
  CapRateCard.tsx       # card de calculadora (vendedor)
  Calculadora.tsx       # calculadora completa con lógica
```

---

## Lógica JavaScript relevante

### Contador de cupos (inversionista)
```js
// Empieza en 77, baja de a 1 cada 25-60 segundos (random)
// Mínimo 58 (no baja más)
// Al enviar formulario, resta 1 más
let cupos = 77
```

### Calculadora de precio (vendedor)
```js
// Input: arriendo mensual en pesos CLP
// Fórmula: precio = (arriendo * 12) / cap_rate
// Cap rates: 4.5%, 5.0%, 5.5%, 6.0%
// Display: en pesos (ej: $106,7M) y en UF (usando UF = $38.000)
function calcular(arrendoMensual) {
  const anual = arrendoMensual * 12
  return {
    cap45: anual / 0.045,
    cap50: anual / 0.050,
    cap55: anual / 0.055,
    cap60: anual / 0.060,
  }
}
```

---

## Animaciones

- Hero: `fadeUp` en cada hijo (opacity 0→1, translateY 16px→0), delay escalonado
- Pilares: hover con `translateY(-2px)` y borde naranja
- FAQ: max-height transition para accordion
- Barra de cupos: animación `grow` al cargar
- Contador de cupos: scale(1.15) → scale(1) al bajar

---

## Navegación entre páginas

- Header inversionista: link "Vender propiedad" → `/vendedor`
- Header vendedor: link "Quiero invertir" → `/` (en naranja, destacado)
- Footer inversionista: link a `/vendedor`
- Footer vendedor: link a `/`

---

## Notas importantes

- **Los formularios persisten en la DB del portal** vía `POST {NEXT_PUBLIC_PORTAL_URL}/api/public/leads`. Una sola DB (Neon) entre landing y portal — el endpoint hace upsert idempotente del `Lead` por email. La env `NEXT_PUBLIC_PORTAL_URL` default a `https://portal.maxrent.cl`.
- **Inversionista** tras submit OK ofrece CTA "Continuar al portal →" que redirige a `/login?email=...&newLead=1&callbackUrl=/perfil` con magic link / Google preseleccionado, y dispara welcome email automático.
- **Vendedor** mantiene la pantalla "Recibimos tus datos" sin redirigir (no hay flujo de vendedor en el portal).
- El portal vive en `portal.maxrent.cl` — proyecto separado en Vercel, schema y flujos en `maxrent-portal/CONTEXTO-PROYECTO.md`.
- No hay CMS — todo el contenido del landing está hardcodeado en componentes React.
- El proyecto del landing corre con `npm run dev` sin configuración adicional (no necesita DB propia).
