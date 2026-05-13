/**
 * Tests del helper de rate limit.
 *
 * Cubrimos:
 *   - Extracción de IP desde distintos headers (x-forwarded-for con múltiples
 *     IPs, x-real-ip, cf-connecting-ip, fallback "unknown").
 *   - Fail-open cuando Vercel KV no está configurada (sin env vars).
 *   - Configuración de los 4 buckets — que existan los valores esperados.
 *
 * No conectamos a Redis real. El módulo está diseñado para entrar en fail-open
 * automáticamente si no encuentra `KV_REST_API_URL` / `KV_REST_API_TOKEN`,
 * que es exactamente el estado del entorno de tests.
 */

import { describe, expect, it } from "vitest";
import {
  RATE_LIMITS,
  checkRateLimitForKey,
  getClientIp,
  isRateLimitEnabled,
} from "./rate-limit-core";

function makeReq(headers: Record<string, string>): Request {
  return new Request("https://example.com/", { headers });
}

describe("getClientIp", () => {
  it("toma la primera IP de x-forwarded-for (caso clásico Vercel)", () => {
    const req = makeReq({ "x-forwarded-for": "203.0.113.42, 10.0.0.1" });
    expect(getClientIp(req)).toBe("203.0.113.42");
  });

  it("trimea espacios alrededor de la primera IP", () => {
    const req = makeReq({ "x-forwarded-for": "  198.51.100.7  , 10.0.0.1" });
    expect(getClientIp(req)).toBe("198.51.100.7");
  });

  it("cae a x-real-ip si no hay x-forwarded-for", () => {
    const req = makeReq({ "x-real-ip": "192.0.2.55" });
    expect(getClientIp(req)).toBe("192.0.2.55");
  });

  it("cae a cf-connecting-ip si los otros no están", () => {
    const req = makeReq({ "cf-connecting-ip": "192.0.2.99" });
    expect(getClientIp(req)).toBe("192.0.2.99");
  });

  it("devuelve 'unknown' si no encuentra ningún header de IP", () => {
    const req = makeReq({});
    expect(getClientIp(req)).toBe("unknown");
  });

  it("prefiere x-forwarded-for sobre x-real-ip cuando ambos están", () => {
    const req = makeReq({
      "x-forwarded-for": "203.0.113.10",
      "x-real-ip": "10.0.0.1",
    });
    expect(getClientIp(req)).toBe("203.0.113.10");
  });
});

describe("checkRateLimitForKey en modo fail-open (sin KV)", () => {
  // Importante: estos tests dependen de que KV_REST_API_URL / KV_REST_API_TOKEN
  // NO estén seteados en el entorno de tests. Eso es lo normal cuando
  // `npm run test` corre en local o en CI sin las env vars de Vercel.
  it("isRateLimitEnabled devuelve false cuando KV no está configurada", () => {
    expect(isRateLimitEnabled()).toBe(false);
  });

  it("devuelve success=true y skipped=true cuando KV no está configurada", async () => {
    const r = await checkRateLimitForKey("ip:203.0.113.42", RATE_LIMITS.public);
    expect(r.success).toBe(true);
    expect(r.skipped).toBe(true);
    expect(r.remaining).toBe(RATE_LIMITS.public.limit);
  });

  it("permite muchas llamadas seguidas sin bloquear (en fail-open)", async () => {
    for (let i = 0; i < 50; i++) {
      const r = await checkRateLimitForKey("ip:203.0.113.42", RATE_LIMITS.public);
      expect(r.success).toBe(true);
      expect(r.skipped).toBe(true);
    }
  });
});

describe("RATE_LIMITS config", () => {
  it("tiene 4 buckets nombrados con los límites esperados", () => {
    expect(RATE_LIMITS.webhook).toMatchObject({
      name: "webhook",
      limit: 60,
      window: "1 m",
      identifyBy: "ip",
    });
    expect(RATE_LIMITS.public).toMatchObject({
      name: "public",
      limit: 10,
      window: "1 m",
      identifyBy: "ip",
    });
    expect(RATE_LIMITS.authenticated).toMatchObject({
      name: "authenticated",
      limit: 60,
      window: "1 m",
      identifyBy: "userIdOrIp",
    });
    expect(RATE_LIMITS.expensive).toMatchObject({
      name: "expensive",
      limit: 5,
      window: "1 m",
      identifyBy: "userIdOrIp",
    });
  });

  it("el bucket 'expensive' es el más restrictivo de los autenticados", () => {
    expect(RATE_LIMITS.expensive.limit).toBeLessThan(RATE_LIMITS.authenticated.limit);
  });

  it("el bucket 'public' es más restrictivo que 'webhook'", () => {
    expect(RATE_LIMITS.public.limit).toBeLessThan(RATE_LIMITS.webhook.limit);
  });
});
