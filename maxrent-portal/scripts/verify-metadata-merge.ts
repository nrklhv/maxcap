/**
 * Verifies Houm-only metadata shape `{ houm: { ... } }` is visible to catalog picks
 * after `mergedMetadataRoot` includes `houm` in the merge chain.
 *
 * Run: npm run test:metadata-merge
 *
 * @domain maxrent-portal
 */

import assert from "node:assert/strict";
import {
  mergedMetadataRoot,
  staffPropertyListDisplay,
} from "../src/lib/broker/property-metadata-display";
import { catalogFlatPatchFromHoumRaw } from "../src/lib/houm/houm-sync-metadata-flat";
import type { HoumPropertyRaw } from "../src/lib/houm/houm-list-response";

const houmOnly = {
  houm: {
    comuna: "Providencia",
    dir: "Los Leones 123",
    tipo: "Departamento",
    m2: 62,
    dorm: 2,
    ban: 2,
    arriendo: 520_000,
    moneda: "pesos",
    venta: 3100,
    monedaVenta: "UF",
    lat: -33.425,
    lng: -70.61,
  },
};

const d1 = staffPropertyListDisplay("fallback-title", houmOnly);
assert.equal(d1.headline, "Providencia");
assert.equal(d1.m2, "62");
assert.equal(d1.dorm, "2");
assert.ok(d1.arriendoCell.includes("520") || d1.arriendoCell.includes("520.000"));
assert.ok(d1.ventaCell.includes("3100") || d1.ventaCell.includes("3.100"));
assert.equal(d1.lat, -33.425);
assert.equal(d1.lng, -70.61);

const rootOverridesHoum = {
  houm: { comuna: "Santiago", m2: 40, dorm: 1, ban: 1, tipo: "Depto" },
  comuna: "Ñuñoa",
  m2: 55,
  dorm: 2,
  ban: 1,
  tipo: "Departamento",
};

const d2 = staffPropertyListDisplay("x", rootOverridesHoum);
assert.equal(d2.headline, "Ñuñoa");
assert.equal(d2.m2, "55");

const merged = mergedMetadataRoot(rootOverridesHoum);
assert.equal(merged.comuna, "Ñuñoa");
assert.equal((merged.houm as Record<string, unknown>).comuna, "Santiago");

const patch = catalogFlatPatchFromHoumRaw({ id: "demo", ...houmOnly.houm } as HoumPropertyRaw);
assert.equal(patch.comuna, "Providencia");
assert.equal(patch.m2, 62);

console.log("verify-metadata-merge: ok");
