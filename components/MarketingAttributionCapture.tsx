"use client";

import { useEffect } from "react";

import { captureFirstTouchFromUrl } from "@/lib/marketingAttribution";
import { captureFirstTouchReferralFromUrl } from "@/lib/referralCookie";

/**
 * En el arranque de la app del landing:
 *  • Captura first-touch UTM / referrer en `sessionStorage` (vida de pestaña).
 *  • Captura `?ref=` de referido en cookie `mxr_ref` con TTL 60 días.
 * Ambas son idempotentes: no pisan datos previos.
 */
export function MarketingAttributionCapture() {
  useEffect(() => {
    captureFirstTouchFromUrl();
    captureFirstTouchReferralFromUrl();
  }, []);

  return null;
}
