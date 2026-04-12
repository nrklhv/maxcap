"use client";

import { useEffect } from "react";

import { captureFirstTouchFromUrl } from "@/lib/marketingAttribution";

/** Captura first-touch UTM / referrer en sessionStorage en el arranque de la app. */
export function MarketingAttributionCapture() {
  useEffect(() => {
    captureFirstTouchFromUrl();
  }, []);

  return null;
}
