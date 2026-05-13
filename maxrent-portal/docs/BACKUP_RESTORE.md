# Backup + Restore de la base de datos

> Cobertura: backup diario offsite a Vercel Blob con retención 30 días + procedimiento de restore via Neon branch. Cierra el gap entre el PITR de 24h de Neon Free y un descubrimiento tardío de problemas.

## Modelo de respaldo

Tres capas de defensa:

| Capa | Provee | Cobertura |
|---|---|---|
| **Neon Point-in-Time Recovery** (Free) | restore al segundo | últimas **24h** |
| **Vercel Blob `db-backups/`** (este sistema) | restore al día (UTC) | últimos **30 días** |
| **Git + migraciones de Prisma** | schema completo histórico | siempre |

El backup de Blob es **data-only** — el schema se reconstruye con `prisma migrate deploy` desde el repo.

## Flujo automático

Cron de Vercel (`vercel.json`) corre `GET /api/cron/db-backup` todos los días a las **06:30 UTC** (03:30 Chile):

1. Lista tablas user-owned via `information_schema` (excluye `_prisma_migrations`).
2. Por cada tabla: `SELECT *` → JSONL (1 fila = 1 línea JSON).
3. Empaqueta en `.tar.gz` USTAR con `metadata.json` adentro.
4. Sube a Vercel Blob privado: `db-backups/YYYY-MM-DD.tar.gz` (con sufijo random — URL no enumerable).
5. Cleanup: borra blobs con `uploadedAt < hoy − 30 días`.

Auth: `Authorization: Bearer ${CRON_SECRET}`. Sin la env var, el endpoint devuelve 503.

### Configuración requerida

| Env var | Inyectada por | Si falta |
|---|---|---|
| `CRON_SECRET` | Vercel Cron lo envía automáticamente | 503 — endpoint rechaza |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob al activar integración | 503 — endpoint rechaza |
| `DATABASE_URL` | Vercel | Prisma falla al conectar |

## Cuándo restaurar

| Síntoma | Capa a usar | Cómo |
|---|---|---|
| Borrón accidental, < 24h | PITR Neon | Neon Console → Restore branch (1 click) |
| Borrón hace 2–30 días | Vercel Blob | Procedimiento abajo |
| Neon caído | Vercel Blob → otro provider | Levantar Postgres nuevo + restore |
| Schema corrupto | Git + Prisma | `git checkout <migration-anterior>` + `prisma migrate deploy` |

## Procedimiento de restore (Vercel Blob)

> **Nunca restaurar directo a producción.** Restaurar primero a un **Neon branch** para validar y después promoverlo o copiar datos manualmente.

### Paso 1 · Bajar el backup desde Vercel

1. https://vercel.com/dashboard → **maxrent-portal** → **Storage** → **maxrent-portal-backups**.
2. Navegar a `db-backups/`.
3. Click en el archivo del día deseado (ej. `2026-05-10.tar.gz`).
4. **Download**.

### Paso 2 · Crear un Neon branch desde el momento anterior al incidente

1. Neon Console → **Branches** → **Create branch**.
2. Source: `main` (o `production`, según cómo se llame).
3. **Time travel**: elegí el momento **antes** del incidente.
4. Name: `restore-test-YYYY-MM-DD`.
5. Crear.
6. Copiar el `DATABASE_URL` del branch.

### Paso 3 · Aplicar el schema al branch

```bash
DATABASE_URL='<url-del-branch>' npx prisma migrate deploy
```

Esto recrea `_prisma_migrations` con el estado actual del repo. Si necesitas restaurar a un schema anterior, primero `git checkout <commit-de-cuando-pasó-el-problema>` y luego correr migrate deploy.

### Paso 4 · Restaurar los datos del tarball

```bash
npx tsx scripts/restore-from-backup.ts \
  --tarball ~/Downloads/2026-05-10.tar.gz \
  --target-url '<url-del-branch>' \
  --block-prod-host 'ep-royal-waterfall-aeuf7p34.c-2.us-east-2.aws.neon.tech'
```

El script:

1. Te muestra el host destino y pide escribir literalmente **`restore`** para continuar.
2. Rechaza la corrida si `--block-prod-host` matchea con el `--target-url` (defensa contra apuntar a prod por accidente).
3. `TRUNCATE ... CASCADE` de todas las tablas user-owned.
4. Lee cada `.jsonl` y hace `INSERT` en batches de 500 filas.
5. Reporta filas insertadas por tabla.

`--block-prod-host` debe ser un substring presente solo en el hostname de prod. Si lo omites, el script lanza un warning pero permite continuar.

### Paso 5 · Validar el branch restaurado

Conectarse al branch con `psql` o Prisma Studio:

```bash
DATABASE_URL='<url-del-branch>' npx prisma studio
```

Verificar:

- Tablas críticas tienen las filas esperadas.
- Reservas / usuarios / pools del momento esperado están presentes.
- Spot-check de algunas filas conocidas.

### Paso 6 · Promover el branch (si todo cuadra)

Dos formas:

**Opción A — promover el branch a primario** (atómico, downtime breve):

1. Neon Console → branch restaurado → **Set as primary**.
2. Vercel detecta el cambio (si `DATABASE_URL` apunta al endpoint default) o actualiza la env var en Vercel → Settings → Environment Variables.
3. Redeploy de Vercel para que las nuevas connections vayan al branch nuevo.

**Opción B — copiar datos selectivamente** (sin downtime, más manual):

1. Identificar las tablas/filas a copiar.
2. `pg_dump --data-only --table=tabla` del branch restaurado.
3. `psql` contra prod aplicando el dump quirúrgicamente.
4. Recomendado solo para restores parciales (ej. una tabla específica corrupta).

## Test de restore mensual (recomendado)

Una vez al mes, sin esperar a un incidente:

1. Bajar el backup del día.
2. Restaurar a un branch test (`restore-test-monthly-YYYY-MM`).
3. Verificar con Prisma Studio o queries puntuales.
4. Eliminar el branch.

Esto te garantiza que los backups **sirven** (no solo que se generan). Backups que no se testean no son backups.

## Métricas y monitoreo

El endpoint cron devuelve JSON con métricas en cada corrida:

```json
{
  "ok": true,
  "blobUrl": "https://...",
  "blobPath": "db-backups/2026-05-13.tar.gz",
  "sizeBytes": 1234567,
  "totalRows": 4321,
  "tables": [{"name": "users", "rows": 12}, ...],
  "schemaVersion": "20260512200000_add_pools",
  "retention": {"days": 30, "deleted": 1, "deletedPaths": ["db-backups/2026-04-13.tar.gz"]},
  "ranAt": "2026-05-13T06:30:00.000Z"
}
```

Vercel registra cada corrida del cron — chequear **Logs** tab si querés ver si falló.

## Costos

Vercel Blob free tier: **1 GB storage**, **1 GB bandwidth/mes**.

Estimación de uso actual:
- DB ~100 leads + 1 pool de 103 unidades + ~10 reservas + ~5 evaluaciones ≈ **1–5 MB sin comprimir** → **<1 MB comprimido** por dump.
- 30 dumps × 1 MB = **30 MB**. Estamos al 3% del free tier.
- Si la DB crece a 100 MB cruda → ~25 MB comprimida × 30 = 750 MB. Aún dentro del free tier.

Cuando se acerque al límite, subir a Vercel Blob Pro o migrar a R2 (10 GB free).

## Riesgos residuales no cubiertos

- **Compromiso de cuenta Vercel** → atacante con acceso puede borrar backups Y prod. Mitigación futura: backup secundario a otro provider (R2 / GitHub release).
- **Bug en el dump que serializa mal un tipo nuevo** → si Prisma agrega un tipo exótico que `JSON.stringify` no maneja bien, una columna podría quedar mal. Test de restore mensual lo detectaría.
- **Schema cambia entre dump y restore** → el script de restore valida que el JSONL tenga las columnas esperadas, pero si una columna se renombró entre el dump y el restore, hay que mappear manualmente.

## Roadmap

- [ ] Test de restore automatizado en CI (semanal): baja el último backup → restaura a branch test → corre query smoke test → borra branch.
- [ ] Backup adicional a R2 / S3 (provider secundario) — defensa contra compromiso de Vercel.
- [ ] Alerta a Slack si el cron falla 2 veces seguidas.
- [ ] Subir a Neon Launch ($19/mes) para PITR de 7 días — cierra el gap intra-día sin depender del dump.
