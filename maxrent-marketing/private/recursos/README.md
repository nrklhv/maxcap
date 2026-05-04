# Recursos descargables

Los archivos de cada categoría viven en su carpeta. La home y `/categoria/<slug>` los listan automáticamente (no hay manifest que actualizar).

## Para agregar un archivo nuevo
1. Drop el archivo en la subcarpeta correspondiente (`logos/`, `piezas-feed/`, etc.).
2. Commit + push.
3. Vercel redeploya automáticamente; el archivo aparece en el listado.

## Para agregar una categoría nueva
1. Sumar la entrada en `src/lib/recursos.ts` (`CATEGORIES`).
2. Crear `private/recursos/<slug>/`.
3. Subir archivos como en el paso anterior.

## Por qué `private/` y no `public/`
Si los archivos vivieran en `public/`, Next.js los serviría en URLs directas sin pasar por el middleware de auth — cualquiera con el link tendría acceso. Acá se sirven via `/api/recursos/<slug>/<archivo>`, que valida la sesión.

## Subcarpetas
Se admiten subcarpetas dentro de cada categoría — el listador es recursivo y aplana la ruta en el nombre visible.
