/**
 * Robots policy del portal MaxRent.
 *
 * El portal es una herramienta privada (login requerido en casi todas las rutas)
 * y durante el beta cerrado no debe ser indexado por buscadores. Bloqueamos todo.
 *
 * Si en el futuro queremos indexar alguna landing pública (ej. `/brokers`),
 * se puede agregar como excepción acá:
 *
 *   { userAgent: "*", disallow: "/", allow: ["/brokers"] }
 *
 * @route /robots.txt
 */

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
