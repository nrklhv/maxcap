# Migración a la organización Houm — runbook

> Objetivo: que **cualquier dev del equipo Houm** pueda colaborar en el portal, deployar, debugear incidentes y recuperar la operación si el dueño actual (NK) no está disponible. Reducir el bus factor de 1 a N.

Este runbook está en orden de ejecución. **No saltearse las pre-flight checks** — sin esos confirmados, los pasos posteriores pueden romper producción.

---

## Pre-flight: confirmar antes de empezar

Bloquean toda la migración hasta tenerlos resueltos.

### P1 · Org de Houm en GitHub

**Qué necesito saber**:
- ¿Cuál es el handle exacto de la org en GitHub? (ej. `houm`, `houm-tech`, `houm-spa`).
- ¿Tengo permisos para crear repos en esa org? Test: `gh repo create <org>/test-perms --private`. Si funciona, tenés permisos. Si no, sumate a la org o pide rol.
- ¿Tengo permisos para **aceptar transfer** de un repo? (es distinto a crear repos — requiere ser admin/owner de la org, no solo miembro).

**A quién preguntar**: CTO o tech lead de Houm. Si nadie sabe, mirar github.com → tu cuenta → "Organizations" en el sidebar — ahí aparecen las orgs donde sos miembro.

**Salida esperada de esta etapa**:
```
ORG_HANDLE = "houm"   # o el que corresponda
ROL_EN_ORG  = "owner" # ideal; "member" alcanza para crear repos pero no para transfers
```

### P2 · Cuenta Vercel de Houm

**Qué necesito saber**:
- ¿Houm tiene un **Team en Vercel** (paid o gratuito)?
- ¿Mi cuenta personal está agregada al team? Si no, pedir invitación a quien administre Vercel en Houm.

Test: https://vercel.com/dashboard → dropdown superior izquierdo → buscar un team "Houm" o similar.

**Si Houm no tiene team Vercel todavía**:
- Crear un Team es gratis (plan Hobby Team) o $20/mes/miembro (Pro Team).
- Hobby Team alcanza para empezar, pero limita features (los crons hobby ya los tenemos al límite).
- Recomendado: crear directamente Pro Team. ~$60/mes para 3 devs es razonable para una app que maneja dinero.

### P3 · Password manager corporativo

**Qué necesito saber**:
- ¿Houm tiene 1Password / Bitwarden / Dashlane Teams?
- Si sí: pedir un vault dedicado para "MaxRent infrastructure" donde guardar credenciales compartidas.
- Si no: **es bloqueante**. Sin password manager compartido, las credenciales de Neon / GoDaddy / Floid / etc. solo viven en tu cabeza y no se pueden compartir de forma segura.

**Recomendación si Houm no tiene uno**:
- **1Password Teams** — $8/usuario/mes. El estándar de la industria.
- **Bitwarden Teams** — $3-6/usuario/mes. Open source, más barato.
- Para 5 devs: ~$15-40/mes. Costo ínfimo comparado con el riesgo de bus factor.

### P4 · Lista de developers que necesitan acceso

Antes de migrar conviene saber **quién** va a tener acceso:

| Rol | Acceso necesario | Cuántos |
|---|---|---|
| Tech lead | Owner GitHub + Vercel + Neon + DNS | 1-2 |
| Senior dev | Admin GitHub + Vercel + Neon read/write | 1-3 |
| Junior dev | Write GitHub + Vercel Preview deploys | 1-3 |
| Designer / PM (read-only) | Read GitHub + Vercel deployments | 0-2 |

Necesitás los **emails + GitHub usernames** de cada uno antes de arrancar.

---

## Capa 1 · GitHub (1-2 horas)

Estado actual: `github.com/nrklhv/maxcap` (cuenta personal).

### Opción A · Transfer ownership (recomendada si tenés permisos en P1)

**Ventajas**: mantiene historia completa, todos los PRs, issues, releases, secrets de GitHub Actions, branch protection. Vercel detecta el nuevo path y sigue funcionando sin tocar nada.

**Pasos**:

1. Confirmar que `<ORG_HANDLE>/maxcap` **no existe** (sino la transfer falla por colisión de nombre).
   ```bash
   gh repo view <ORG_HANDLE>/maxcap
   # debe decir "Could not resolve to a Repository"
   ```

2. Iniciar transfer desde la UI:
   - https://github.com/nrklhv/maxcap → **Settings** → bajar a **Danger Zone** → **Transfer ownership**.
   - New owner's GitHub username: `<ORG_HANDLE>`.
   - Confirmar escribiendo `nrklhv/maxcap`.
   - **Transfer**.

3. Alguien con permisos de owner en la org de Houm **debe aceptar** la transfer (le llega un mail). Coordinar.

4. **Verificar redirects**: tras aceptar, todas las URLs viejas `github.com/nrklhv/maxcap/*` redirigen a `github.com/<ORG_HANDLE>/maxcap/*` automáticamente. Vercel, NextAuth callback URLs, y cualquier link en docs sigue funcionando.

5. **Actualizar `git remote` en tu local**:
   ```bash
   cd /Users/nk/0.\ Proyectos/maxcap
   git remote set-url origin git@github.com:<ORG_HANDLE>/maxcap.git
   git remote -v   # confirmar
   git pull        # debe funcionar
   ```

6. Actualizar el remote también en los worktrees activos:
   ```bash
   cd /Users/nk/0.\ Proyectos/maxcap/.claude/worktrees/
   for w in */; do
     cd "$w/maxrent-portal" 2>/dev/null && git remote set-url origin git@github.com:<ORG_HANDLE>/maxcap.git
     cd /Users/nk/0.\ Proyectos/maxcap/.claude/worktrees/
   done
   ```

### Opción B · Push a un repo nuevo (si no podés hacer transfer)

**Ventajas**: cero permisos especiales requeridos (solo necesitás crear repo en la org como member).
**Desventajas**: perdés PRs antiguos, issues, redirects automáticos. Hay que actualizar todos los links.

**Pasos**:

1. Crear repo nuevo:
   ```bash
   gh repo create <ORG_HANDLE>/maxcap --private \
     --description "MaxRent portal — landing + inversionista + broker + staff"
   ```

2. Push del git completo (incluye todas las branches y tags):
   ```bash
   cd /Users/nk/0.\ Proyectos/maxcap
   git remote add houm git@github.com:<ORG_HANDLE>/maxcap.git
   git push houm --mirror
   ```

3. En Vercel → maxrent-portal → **Settings** → **Git** → **Disconnect** repo viejo → **Connect** repo nuevo `<ORG_HANDLE>/maxcap`.

4. Probar un deploy de prueba: push de una branch nueva → ver que Vercel dispara preview.

5. Cuando todo esté OK, archivar el repo viejo en `nrklhv/maxcap`:
   - github.com/nrklhv/maxcap → Settings → Danger Zone → **Archive this repository**.
   - Esto lo deja read-only pero accesible para referencia.

### Branch protection (después de cualquiera de las dos opciones)

Configurar en `<ORG_HANDLE>/maxcap` → **Settings** → **Branches** → **Add branch protection rule** para `main`:

- ✓ Require a pull request before merging
- ✓ Require approvals: **1** (mínimo; o 2 si el equipo crece)
- ✓ Dismiss stale pull request approvals when new commits are pushed
- ✓ Require status checks to pass before merging (cuando agreguemos CI)
- ✓ Require conversation resolution before merging
- ✓ Do not allow bypassing the above settings (importante — sin esto el owner sí puede bypassear)

### Code review

- Definir convención: ¿quién es review por default? Suele ser CODEOWNERS file.
- Crear `.github/CODEOWNERS`:
  ```
  # Default: todo cambio requiere review de NK (transición)
  * @nrklhv

  # En el futuro, distribuir por área:
  # /maxrent-portal/src/lib/services/payment.service.ts @nrklhv @<otro-dev>
  # /docs/ @nrklhv
  ```

### GitHub Actions secrets

Hoy **no hay GitHub Actions configurados** (`vercel.json` define los crons, no Actions). Si en el futuro se agrega CI/CD con Actions:

- Los secrets se guardan en `<ORG_HANDLE>/maxcap` → Settings → Secrets and variables → Actions.
- Org-level secrets (compartidos entre repos de Houm) se pueden definir en la org una vez.
- **Nunca** poner secrets en código (incluso si el repo es privado — todo el equipo los vería en git log).

---

## Capa 2 · Vercel (2-3 horas)

Estado actual: project `maxrent-portal` en la cuenta personal de NK (Hobby plan).

### Opción A · Transfer project a Team Houm (recomendada)

**Ventajas**: el proyecto se mueve completo con env vars (40+), storage integrations (KV, Blob), dominios (`portal.maxrent.cl`), deploy history. Cero re-configuración.

**Pre-requisito**: tener Team Houm en Vercel y ser owner/admin del team destino.

**Pasos**:

1. Vercel → maxrent-portal → **Settings** → **General** → bajar hasta **Transfer Project**.

2. Click **Transfer Project**:
   - Destination: seleccionar el team de Houm.
   - Confirmar el nombre del proyecto.
   - **Transfer**.

3. **Verificaciones post-transfer**:

   a. Env vars (Settings → Environment Variables) — deben aparecer las ~40 variables intactas:
      ```
      NEXTAUTH_URL, NEXTAUTH_SECRET, DATABASE_URL, GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET, RESEND_API_KEY, EMAIL_FROM, FLOID_API_KEY,
      KV_REST_API_URL, KV_REST_API_TOKEN, BLOB_READ_WRITE_TOKEN,
      CRON_SECRET, STAFF_SUPER_ADMIN_EMAILS, ...
      ```

   b. Storage integrations (Storage tab) — deben aparecer KV (`maxrent-portal-kv`) y Blob (`maxrent-portal-backups`) linkeadas.

   c. Domains (Settings → Domains) — `portal.maxrent.cl` debe estar listado con estado verde.

   d. Cron Jobs (Settings → Cron Jobs) — `/api/cron/db-backup` y `/api/cron/referrals/expire` deben aparecer.

   e. Deploy de prueba: push un commit chico (ej. fix de typo en README) → Vercel debe deployar igual que antes.

4. **Update de redirect URIs en Google Cloud** (solo si cambia el dominio del proyecto Vercel, lo cual NO debería pasar con un transfer):
   - https://console.cloud.google.com → APIs & Services → Credentials → OAuth client → Authorized redirect URIs.
   - Lo importante: la URI `https://portal.maxrent.cl/api/auth/callback/google` sigue igual porque el custom domain no cambia.

### Opción B · Crear proyecto nuevo y migrar manual (no recomendado)

Solo si no hay forma de hacer transfer. Implica:

1. En Team Houm Vercel: **New Project** → conectar al repo `<ORG_HANDLE>/maxcap` → seleccionar el subdirectorio `maxrent-portal/` como root.
2. Copiar las 40+ env vars una por una desde el proyecto viejo.
3. Re-crear las storage integrations (KV + Blob) — esto genera env vars nuevas, no las podés reusar.
4. Re-importar el pool si el `BLOB_READ_WRITE_TOKEN` cambió (el script de import usa la DB Neon, así que probablemente no — pero los backups previos quedan en el Blob viejo).
5. Transferir el custom domain `portal.maxrent.cl` (verification token, etc.).
6. Cuando todo esté OK, deshabilitar el deploy del proyecto viejo.

Esta opción tiene **muchos puntos de falla**. Solo usar si Transfer Project no es posible por restricciones del plan o de la cuenta.

### Acceso de developers al proyecto Vercel

Después del transfer:

- Vercel Team de Houm → Settings → Members → Invite Member.
- Roles: **Member** (puede ver, deploy de previews, no puede editar settings críticos); **Admin** (todo); **Owner** (admin + billing).

Recomendación:
- 1-2 owners (tech lead + backup).
- 2-3 admins (devs senior).
- Resto como members.

---

## Capa 3 · Servicios externos (1 día de coordinación)

Esta capa es la que se olvida más fácil y la que más duele si no se hace.

### 3.1 · Neon (base de datos)

**Estado actual**: project en cuenta personal NK.

**Pasos**:

1. Neon Console → tu proyecto **maxrent-portal** → Settings → **Members** (o "Sharing" según versión).
2. Invitar emails de los devs como **Member** (lectura/escritura) o **Admin** (todo).
3. Si Houm tiene una **Neon Organization** (paid feature), considerar transferir el project a la org:
   - Neon Console → Project → Settings → **Transfer** → seleccionar org Houm.
   - Igual que con Vercel, esto mantiene todo intacto (branches, history, connection strings).

**Rotación de `DATABASE_URL`** (pendiente desde hace varios días):
- Neon Console → Project → **Roles** → role `neondb_owner` → **Reset password**.
- Copiar el nuevo connection string.
- Vercel → Settings → Environment Variables → editar `DATABASE_URL` con el nuevo valor.
- Vercel deploya automáticamente.

### 3.2 · DNS — GoDaddy

**Estado actual**: dominio `maxrent.cl` registrado en GoDaddy con cuenta personal NK.

**Problema**: GoDaddy **no tiene** teams nativos como AWS / Vercel. Las opciones son:

**A · Account Sharing via Account Manager** (recomendada):
- GoDaddy → My Account → **Delegate Access** (o "Account Manager").
- Invitar el email del tech lead de Houm como **Manager** o **Productivity Manager**.
- Esa cuenta delegada puede modificar DNS sin tener la password principal.
- Limitación: solo 1-2 delegados; no es un team pleno.

**B · Crear cuenta GoDaddy compartida del equipo** (más limpia a futuro):
- Crear `devops@houm.cl` (o similar) como nuevo email.
- En GoDaddy, transferir el dominio a esa cuenta nueva.
- Compartir las credenciales de esa cuenta via password manager.
- Activar 2FA con app TOTP (las claves del seed se pueden compartir si el password manager las soporta).

**C · Mover el dominio a otro registrar con teams** (más invasivo):
- AWS Route 53 / Cloudflare Registrar tienen acceso de equipo.
- Implica transfer del dominio (5-7 días, paciencia con el TLD `.cl`).

**Recomendación para Houm**: Opción B. Migra a cuenta corporativa con 2FA + password manager. Es la práctica estándar.

### 3.3 · Google Cloud (OAuth credentials)

**Estado actual**: GCP project en cuenta personal NK.

**Pasos**:

1. https://console.cloud.google.com → seleccionar el project que tiene los OAuth credentials.
2. **IAM & Admin** → **IAM** → **Grant Access**.
3. Agregar emails del equipo con rol **Owner** o **Editor**.
4. Considerar transferir el project a la organización GCP de Houm (si existe):
   - Cloud Console → IAM → **Move project** → seleccionar la org destino.

### 3.4 · Floid

**Estado actual**: cuenta personal NK.

**Pasos**:

1. Verificar si Floid soporta multi-user en su dashboard. Si sí: agregar developers como users.
2. Si no: la **API key** (`FLOID_API_KEY`) es el único acceso real al servicio. Compartir via password manager. Rotarla cada 6 meses.

### 3.5 · Resend

**Estado actual**: cuenta personal NK.

**Pasos**:

1. Resend → **Settings** → **Team** (Resend tiene teams nativos en plan paid).
2. Invitar developers como **Member** o **Admin**.
3. Si Resend Team requiere plan paid y todavía estamos en Free, considerar el upgrade ($20/mes para el plan Pro).

### 3.6 · Vercel KV + Vercel Blob

**Estado actual**: parte del proyecto Vercel personal.

Se mueven automáticamente con el transfer del proyecto (Capa 2). Pero hay que verificar post-transfer que las env vars `KV_REST_API_*` y `BLOB_READ_WRITE_TOKEN` siguen siendo las mismas (debería).

### 3.7 · Mercado Pago (futuro)

**Estado actual**: integración pendiente.

Cuando se implemente:
- Crear cuenta MP **a nombre de la empresa Houm** (no personal). MP exige RUT empresa para el plan business.
- Multi-user vía MP Business Console.
- API tokens en password manager del equipo.

---

## Capa 4 · Documentación operativa

Después de la migración, hay 3 docs nuevos que conviene tener:

### `docs/CREDENTIALS_INVENTORY.md`

Lista de **dónde** está cada credencial (NO los valores). Ej:

```
| Servicio | Valor en | Quién tiene acceso | Rotar cada |
|---|---|---|---|
| DATABASE_URL | Vercel env var + 1Password "MaxRent infra" | NK, tech lead, senior dev | 6 meses |
| FLOID_API_KEY | Vercel env var + 1Password | NK, tech lead | 6 meses |
| CRON_SECRET | Vercel env var | NK | nunca |
| GoDaddy admin | 1Password "MaxRent infra" | NK, tech lead | nunca |
...
```

### `docs/ONBOARDING_NEW_DEV.md`

Checklist para sumar un dev nuevo. Una lista markdown con cosas como:

- [ ] Invitar a `<ORG_HANDLE>/maxcap` (GitHub).
- [ ] Invitar al team Vercel.
- [ ] Invitar a Neon project.
- [ ] Invitar al vault de 1Password "MaxRent infra".
- [ ] Mandar `docs/CONTRIBUTING.md` + `docs/SETUP.md`.
- [ ] Confirmar que pudo correr `npm run dev` localmente.
- [ ] Asignar primer ticket de prueba.

### `docs/INCIDENT_RUNBOOK.md`

Qué hacer en cada incidente típico:

- DB corrupta / data perdida → procedimiento de restore (ver `BACKUP_RESTORE.md`).
- Vercel deploy roto → rollback manual.
- Floid devuelve errores → fallback / contactar a Floid.
- Resend baja → ¿se acumulan emails? ¿retry policy?
- Dominio `maxrent.cl` expira → ¿quién recibe el aviso? ¿quién paga?

---

## Capa 5 · Mantenimiento del bus factor

Una vez migrado, el bus factor **se degrada** si no se mantiene. Recomendaciones:

### Revisión trimestral

- Confirmar que cada dev activo tiene acceso a los servicios que necesita.
- Remover acceso de devs que dejaron el equipo.
- Verificar `docs/CREDENTIALS_INVENTORY.md` actualizado.

### Rotación de secrets

- `DATABASE_URL`, `FLOID_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`: rotar cada 6 meses (o ante exposición incidental).
- Coordinar la rotación con un deploy fresh para que las lambdas tomen el valor nuevo.

### Test de bus factor

- 1 vez al año, simular que NK no está disponible.
- Asignar a otro dev una tarea que requiera deploy + acceso a DB + cambio de DNS.
- Si se traba en algún paso, ese paso necesita más documentación o más permisos.

---

## Anexo · Costos estimados de la migración

| Recurso | Costo |
|---|---|
| GitHub Org (private repos) | $0 (Free tier de orgs alcanza para empezar) |
| Vercel Pro Team (recomendado para más crons + observability) | $20/mes/miembro |
| 1Password Teams | $8/usuario/mes |
| Neon (sin upgrade) | $0 |
| Resend (Pro para Team) | $20/mes |
| **Total para equipo de 3 devs** | **~$84/mes** |

Considerar: si ya cae 1 incidente serio sin equipo que pueda intervenir, la pérdida supera fácil 12 meses de este costo.

---

## Quick checklist (para tener a mano al ejecutar)

- [ ] **P1** Org GitHub Houm confirmada + permisos validados
- [ ] **P2** Team Vercel Houm existe o se crea
- [ ] **P3** Password manager corporativo definido
- [ ] **P4** Lista de devs con sus emails / GitHub usernames
- [ ] **Capa 1** Transfer (o push) del repo GitHub
- [ ] **Capa 1** Branch protection configurado
- [ ] **Capa 1** CODEOWNERS creado
- [ ] **Capa 1** `git remote` actualizado en local + worktrees
- [ ] **Capa 2** Transfer del proyecto Vercel
- [ ] **Capa 2** Verificación post-transfer (env vars, storage, dominios, crons)
- [ ] **Capa 2** Deploy de prueba exitoso
- [ ] **Capa 2** Members invitados al Team Vercel
- [ ] **Capa 3** Neon: developers invitados al project
- [ ] **Capa 3** `DATABASE_URL` rotado (pendiente desde antes)
- [ ] **Capa 3** GoDaddy: account sharing o cuenta compartida
- [ ] **Capa 3** Google Cloud: IAM members agregados
- [ ] **Capa 3** Floid: acceso compartido (multi-user o password manager)
- [ ] **Capa 3** Resend: team configurado
- [ ] **Capa 4** `docs/CREDENTIALS_INVENTORY.md` creado
- [ ] **Capa 4** `docs/ONBOARDING_NEW_DEV.md` creado
- [ ] **Capa 4** `docs/INCIDENT_RUNBOOK.md` creado
- [ ] **Capa 5** Calendario con review trimestral + rotación de secrets

---

> **Importante**: este runbook asume que NK lo ejecuta o coordina. Si NK no está disponible, el primer paso para cualquier otro dev es **identificar quién tiene acceso a la cuenta GoDaddy** (esa es la única credencial sin la cual no se puede recuperar el dominio). Mientras GoDaddy esté en cuenta personal sin sharing configurado, el bus factor sigue siendo crítico para el dominio.
