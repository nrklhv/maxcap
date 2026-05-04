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

## Logo — MaxRent by Houm

SVG inline (componente `components/Logo.tsx`). Dos chevrones `<<` + wordmark `MAXRENT` + endoso `by Houm` en italic serif alineado a la derecha:

- Chevrón izquierdo (atrás): `#FF6701` (naranja brillante)
- Chevrón derecho (adelante): `#CC4A28` (naranja quemado)
- Wordmark `MAXRENT`: `#EDE0CC` (crema), `DM Sans` weight 300, letter-spacing amplio
- Endoso `by Houm`: `DM Serif Display` italic, `#EDE0CC` con opacity 0.85, alineado a la derecha del bloque

ViewBox canónico `140×42`. Los `sizes` solo escalan:
- `sm` (Header): 140×42 px
- `md` (Footer): 160×48 px
- `lg` (Hero): 200×60 px

Uso: `<Logo size="sm" />` (default), `<Logo size="md" />`, `<Logo size="lg" />`.

La marca refleja que **MaxRent es una iniciativa de Houm** — el "by Houm" funciona como sello editorial sin competir con el wordmark principal.

---

## Estructura de páginas

### `/` — Página Inversionista

**Layout en desktop:** contenido izquierdo + formulario sticky derecho (420px fijo)
**Layout en mobile:** columna única, formulario arriba o abajo (decidir en iteración)

#### Secciones (en orden):
1. **Header sticky** — logo `MaxRent by Houm` + nav links + CTA `Reservar cupo` + link `Iniciar sesión`
2. **Hero** — fondo `--dark`, headline `Juntos compramos mejor.` + bajada del Club, badge `Club de Inversionistas Calificados · 100 cupos`
3. **Banda de urgencia** — `Tu cupo en el Club`, contador de cupos disponibles, barra de progreso, label dinámico de fase (apertura / cierre / cupos cerrados)
4. **Pilares 2×2** — 4 cards en este orden:
   1. **Pilar 01 · Compramos en bloque, conseguimos mejor precio** (`+5%` cap rate objetivo) — poder de negociación colectiva
   2. **Pilar 02 · Sin comisión de compra y pie en cuotas** (`0%` comisión + pie diferido)
   3. **Pilar 03 · Rentabilidad real desde el día uno** (`+30%` vs nueva) — ventajas de propiedades usadas con renta conocida
   4. **Pilar 04 · Tu propiedad dentro de un pool diversificado** (`Pool`) — teaser de la sección Pool de Propiedades
5. **Usada vs Nueva** — tabla comparativa de 7 filas: cap rate (3,0–3,6% vs +5% objetivo), arriendo bruto, primer arriendo (mes 37–40 vs día 1), pie, riesgo arrendatario, renta garantizada (no existe vs pool diversificado administrado por Houm), comisión de compra (0%/0% con énfasis "único en propiedades usadas"). TIR a 10 años: 7,9% nueva / 11,0% Club MaxRent. Diferencial `+3,1 pp`. 4 insights con foco en cap rate +5%, plusvalía base real, costo de 36 meses sin arriendo y filtro del Club. Sin "riesgo crédito" (no hay Banco Aliado)
6. **Alianza · Una iniciativa de Houm** — header `Houm crea el Club · Renta Capital lo lleva al inversionista`; strip horizontal de 2 partes (Houm "Crea y administra" + Renta Capital "Canal de inversionistas"); 2 EmpresaCards (variantes `houm` + `renta`, sin `bci`); banner final con mensaje de complementariedad (sin Banco Aliado)
7. **Pool de Propiedades** — sección nueva (`id="pool"`, fondo blanco). Header `Tu propiedad. / Estabilidad de un fondo.` + bajada explicando que la propiedad sigue a nombre del inversionista pero entra a un pool administrado por Houm. 3 cards (Vacancia diversificada `1/100`, Morosidad absorbida `100%`, Gastos prorrateados `÷100`). Callout final con la frase clave: *"Tu inversión sigue siendo inmobiliaria. La experiencia se vuelve financiera."*
8. **Cómo funciona** — 6 pasos secuenciales (`StepRow` con línea conectora vertical):
   1. Inscripción en el portal MaxRent (form → portal del inversionista).
   2. Evaluación digital en < 5 min.
   3. Reserva del cupo por 1 UF (post-calificación, devolución según política).
   4. Asesoría en crédito hipotecario por especialista de Renta Capital (sin Banco Aliado).
   5. Firma de compraventa cuando el Club cierra los 100 cupos.
   6. Propiedad entra al pool administrado por Houm.
   Callout final: todo se gestiona dentro del portal del inversionista, especialista de Renta Capital a un click
9. **FAQ** — accordion (incluye plazos, devolución, referidos, pool)
10. **Footer**

**Formulario sticky (desktop):**
- Título: `Reserva tu cupo / en el Club.`
- Bajada: `Un especialista de Renta Capital te contacta en 24 horas...`
- Campos: Nombre, Apellido, Email, WhatsApp
- CTA fijo: `Inscríbete al Club →`
- Microcopy: `Sin compromiso · Sin costo · Tu reserva se devuelve si no obtienes el crédito`
- Tras submit: post a `{PORTAL_URL}/api/public/leads` + pantalla `¡Bienvenido al Club!` con CTA `Continuar al portal →` que redirige con email pre-cargado.

**FAQ (`lib/faqInvestor.ts`):** 14 entradas alineadas al modelo Club. Cubre plazos, política de devolución, programa de referidos, evaluación 5 min, pie en cuotas, comisión 0%, primer arriendo, pool, vacancia/morosidad, crédito hipotecario, propiedades disponibles (modo ciego), comisión Houm, venta anticipada, portal del inversionista.

**Header (sticky, ambas variantes):**
- Logo `MaxRent by Houm` (izquierda)
- Nav links + **link `Iniciar sesión`** (apunta a `{PORTAL_URL}/login` — toggle inversionista/broker)
- CTA: `Inscribirme` (inversionista) o `Enviar datos` (vendedor)

**Plazos del Club (variables en `lib/site.ts`):**
- `CLUB_OPEN_DATE = 1 de junio`
- `CLUB_CLOSE_DATE = 28 de septiembre`
- 4 fases derivadas en `lib/clubPhase.ts`: `pre-launch`, `open`, `closing-soon` (< 30 días), `closed`

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
