<!--
Template estándar de PR para maxcap. GitHub lo auto-rellena en cada PR nuevo.
Borrá las secciones que no apliquen, pero **completá las que sí**.
-->

## Resumen

<!-- Qué hace este PR en 1-3 líneas. Sin "fixes", sin marketing — descripción concreta. -->

## Cambios

<!-- Lista de los módulos / áreas tocadas. Bullet points. -->

-

## Test plan

<!-- Cómo se verificó. Marcá las casillas que aplican. -->

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos verde
- [ ] `npx next build` → "Compiled successfully"
- [ ] Verificado en preview de Vercel
- [ ] (Si toca DB) probado E2E contra DB local con el script de seed
- [ ] (Si toca payment / cron / webhook) `curl` manual del endpoint

## Documentación

<!--
OBLIGATORIO. Si este PR toca código y no actualizás docs, el CI va a fallar.
Si genuinamente no aplica, agregá '[skip docs]' al título del PR.
-->

- [ ] `docs/<TEMA>.md` actualizado (RATE_LIMIT / BACKUP_RESTORE / POOL_PRODUCTO / etc.)
- [ ] `CONTEXTO-PROYECTO.md` § 5 (API endpoints) si agregué/cambié endpoints
- [ ] `CONTEXTO-PROYECTO.md` § 6 (flujos técnicos) si agregué un flujo importante
- [ ] `CONTEXTO-PROYECTO.md` § 8 (integraciones) si agregué una integración externa
- [ ] `.env.example` actualizado si agregué env vars
- [ ] `SETUP.md` actualizado si cambia el setup local
- [ ] Memoria personal (`~/.claude/.../memory/`) actualizada si es cambio mayor

## Riesgo de despliegue

<!--
Marcá lo que aplica. Si nada aplica, escribí "ninguno conocido".
-->

- [ ] **Migración Prisma**: nueva migración formal en `prisma/migrations/`. Aditiva / con rollback definido / requiere downtime.
- [ ] **Breaking change** en API consumida por el landing o por mobile.
- [ ] **Cambio en env vars** que requiere setup en Vercel antes del deploy.
- [ ] **Cambio en webhook** que requiere reconfiguración en proveedor externo (Floid / MP / Resend).
- [ ] Ninguno conocido.

## Rollback plan

<!--
Si algo sale mal en prod, ¿cómo volvemos atrás?
Para PRs de docs / fixes triviales: "revert del PR". Para cambios estructurales: detallar.
-->

🤖 Generated with [Claude Code](https://claude.com/claude-code)
