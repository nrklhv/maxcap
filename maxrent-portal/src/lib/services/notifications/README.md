# Notifications service

Capa de comunicaciones saliente del portal. Vendor-agnostic + audit trail completo.

## Reglas de oro

- **NUNCA** importar SDKs de proveedores (`resend`, `@sendgrid/mail`, etc.) desde código de negocio. Siempre vía `notify()`.
- **NUNCA** poner templates en el dashboard del proveedor. Viven en este repo, versionados.
- Cualquier comunicación nueva agrega su `templateKey` al registry y su archivo de template.

## Uso

```ts
import { notify } from "@/lib/services/notifications";

await notify({
  channel: "EMAIL",
  to: lead.email,
  templateKey: "welcome-investor",
  subject: "Bienvenido a MaxRent",
  html: "<h1>Hola</h1>",
  variables: { firstName: lead.firstName },
  userId: user?.id ?? null, // null si todavía no hay cuenta (lead-only)
});
```

Devuelve `{ notificationId, status, providerMessageId? }`.

## Backfill cuando un Lead se convierte en User

```ts
import { backfillUserNotifications } from "@/lib/services/notifications";

// En el evento `createUser` de NextAuth, después de vincular el Lead:
await backfillUserNotifications({ userId: user.id, email: user.email });
```

Asocia las notificaciones que se enviaron al email cuando aún no había cuenta.

## Estructura

```
notifications/
├── index.ts              ← API pública: notify(), backfillUserNotifications()
├── types.ts              ← interfaces: EmailProvider, NotifyInput, etc.
├── providers/
│   ├── _registry.ts      ← selección por env var EMAIL_PROVIDER
│   └── email-resend.ts   ← adapter Resend (primer proveedor)
└── README.md             ← (este archivo)
```

PR siguiente (B) agrega:
- `templates/` con react-email.
- `notifyTemplate({ template, variables })` que renderiza y delega a `notify()`.

PR siguiente (C) agrega:
- `webhook/[provider]/route.ts` que actualiza `Notification.status` y timestamps con events del proveedor.

## Configuración (env vars)

| Variable | Default | Notas |
|---|---|---|
| `EMAIL_PROVIDER` | `resend` | Slug del adapter a usar |
| `RESEND_API_KEY` | — | Solo si `EMAIL_PROVIDER=resend` |
| `EMAIL_FROM` | — | `"MaxRent <noreply@maxrent.cl>"` (verificado en Resend) |
| `RESEND_WEBHOOK_SECRET` | — | Signing secret de Resend → para validar delivery webhooks |

## Webhook de delivery tracking

Resend manda eventos de delivery (delivered/bounced/opened/etc.) al endpoint
`/api/notifications/webhook/resend`. Ese endpoint:

1. Valida la firma con Svix usando `RESEND_WEBHOOK_SECRET`.
2. Mapea el evento al shape común `DeliveryEvent`.
3. Llama a `applyDeliveryEvent()` que actualiza el row de `Notification`
   matching por `providerMessageId`.

Setup en Resend dashboard:
- Webhooks → Add Endpoint.
- URL: `https://portal.maxrent.cl/api/notifications/webhook/resend`.
- Eventos a suscribir: `email.sent`, `email.delivered`, `email.bounced`,
  `email.complained`, `email.opened`, `email.clicked`, `email.delivery_delayed`.
- Resend devuelve un Signing Secret → guardar en `RESEND_WEBHOOK_SECRET`.

## Cambiar de proveedor

1. Crear `email-<slug>.ts` que implemente `EmailProvider` (ver `email-resend.ts` como referencia).
2. Importarlo y agregarlo al map de `providers/_registry.ts`.
3. Cambiar `EMAIL_PROVIDER=<slug>` en Vercel.
4. Setear las env vars del nuevo proveedor.
5. Redeploy.

Nada del código de negocio cambia.

## Tabla `Notification`

Modelo en `prisma/schema.prisma`. Cruce típico:

```ts
// Timeline de comunicaciones de un user
const timeline = await prisma.notification.findMany({
  where: { userId: user.id },
  orderBy: { createdAt: "desc" },
});

// Comunicaciones de un email (incluye lead-only sin cuenta aún)
const byEmail = await prisma.notification.findMany({
  where: { recipient: "x@y.cl" },
});

// Welcome emails que rebotaron en el último mes
const bounces = await prisma.notification.findMany({
  where: {
    templateKey: "welcome-investor",
    status: "BOUNCED",
    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  },
});
```

## Ver también

- `memory/project_notifications_infra.md` (decisión arquitectónica completa)
