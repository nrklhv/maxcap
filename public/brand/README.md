# Brand Assets — MaxRent by Houm

Recursos vectoriales del logo para uso en marketing, presentaciones, redes sociales, prensa, papelería, etc.

## Archivos

| Archivo | Cuándo usar | Fondo recomendado |
|---|---|---|
| `maxrent-by-houm-light.svg` | **Default para fondos oscuros**. Wordmark crema (`#EDE0CC`), chevrones full color. | `#001F30` (navy) o cualquier oscuro corporativo. |
| `maxrent-by-houm-dark.svg` | **Default para fondos claros**. Wordmark navy (`#001F30`), chevrones full color. | Blanco, cream (`#FBF7F3`), cualquier claro. |
| `maxrent-by-houm-mono-dark.svg` | Versión **monocromática navy**. Para impresiones B/N, fax, contextos donde no podemos garantizar reproducción de color. | Blanco / claro. |
| `maxrent-by-houm-mono-light.svg` | Versión **monocromática blanca**. Para fondos de un solo color (ej. fotografía, video con tinta uniforme). | Cualquier color sólido oscuro. |
| `maxrent-icon-color.svg` | **Solo el icono** (chevrones, sin wordmark). Para favicon, avatar de perfil, watermark pequeño, app icon. | Cualquiera. |

## Espacio mínimo y tamaños

- **Tamaño mínimo recomendado**: 100px de ancho para el wordmark completo. Por debajo de eso usá `maxrent-icon-color.svg`.
- **Espacio libre alrededor**: equivalente a la altura del chevrón izquierdo (~6mm en print, ~24px en digital).
- **No deformar**: SVG es vectorial, escalá manteniendo aspect ratio (10:3 para el wordmark, 1:1 para el icono).

## Paleta de marca

```
Naranja brillante (chevrón izq)  #FF6701
Naranja quemado  (chevrón der)   #CC4A28
Wordmark dark    (fondo claro)   #001F30
Wordmark crema   (fondo oscuro)  #EDE0CC
Cream            (fondo neutro)  #FBF7F3
```

## Tipografía

- **Wordmark "MAXRENT"**: DM Sans, weight 300, letter-spacing amplio.
- **Endoso "by Houm"**: DM Serif Display italic.
- Ambas disponibles gratis en [Google Fonts](https://fonts.google.com).

> ⚠️ **Importante para print profesional**: el SVG referencia las fuentes por nombre (`DM Sans`, `DM Serif Display`). Si tu equipo de diseño imprime sin esas fuentes instaladas, el render usa fallback (Helvetica/Georgia) y el resultado se ve distinto. Antes de mandar a imprenta:
> 1. Abrí el SVG en Adobe Illustrator, Inkscape o Figma.
> 2. Convertí el texto a paths/outlines (en Illustrator: `Type → Create Outlines`; en Inkscape: `Path → Object to Path`).
> 3. Exportá la versión con paths para imprimir.

## Convertir SVG a PNG/JPG

El SVG es la fuente oficial. Para usos puntuales que requieran PNG/JPG:

### Opción 1 — Online (más rápido, no requiere instalar nada)
- [cloudconvert.com/svg-to-png](https://cloudconvert.com/svg-to-png) — control de tamaño, mantiene transparencia.
- [svgtopng.com](https://svgtopng.com).

### Opción 2 — Figma / Adobe Illustrator
1. Abrí el SVG.
2. `File → Export` y elegí PNG/JPG con el tamaño deseado.

### Opción 3 — Línea de comandos (si tenés Node)
```bash
npx --yes svg2png-cli maxrent-by-houm-light.svg -w 2048
```

### Tamaños recomendados para PNG

| Uso | Ancho |
|---|---|
| Email header | 600px |
| Twitter/LinkedIn share | 1200px |
| Banner web | 2048px |
| Print media (tarjeta, brochure) | 4096px (300dpi) |
| Avatar / favicon (icono) | 512px square (icon-color.svg) |

## Reglas de uso

✅ **Sí**:
- Mantener proporciones originales (no estirar).
- Respetar espacio libre alrededor.
- Usar la variante de color contraria al fondo (light sobre oscuro, dark sobre claro).
- Preferir SVG cuando se pueda (mejor calidad a cualquier escala).

❌ **No**:
- Cambiar los colores del logo.
- Agregar sombras, bordes, gradientes.
- Rotar o inclinar.
- Recortar o cubrir parte del logo.
- Usar el icono solo en lugar del logo completo cuando hay espacio para el wordmark.
- Reescribir "MAXRENT" o "by Houm" en otra fuente.

## Para una versión específica que no esté acá

Pedile al equipo (`hola@maxrent.cl`) o exportá vos desde:
- Componente React: `components/Logo.tsx` (en el repo del landing) o `maxrent-portal/src/components/Logo.tsx` (en el repo del portal).
- Renderizá con los props que necesites y exportá el SVG resultante.
