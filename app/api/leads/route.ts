import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { leadBodySchema } from "@/lib/validations/leads";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = leadBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa los datos ingresados" }, { status: 400 });
  }

  const data = parsed.data;
  const attribution = data.marketing_attribution;
  const jsonAttribution: Prisma.InputJsonValue | undefined =
    attribution === null || attribution === undefined ? undefined : (attribution as Prisma.InputJsonValue);

  try {
    if (data.type === "inversionista") {
      await prisma.lead.create({
        data: {
          type: "inversionista",
          nombre: data.nombre,
          apellido: data.apellido,
          email: data.email.toLowerCase(),
          whatsapp: data.whatsapp,
          marketingAttribution: jsonAttribution,
        },
      });
    } else {
      await prisma.lead.create({
        data: {
          type: "vendedor",
          nombre: data.nombre,
          apellido: data.apellido,
          email: data.email.toLowerCase(),
          whatsapp: data.whatsapp,
          cantidadPropiedades: data.cantidad_propiedades,
          arrendadas: data.arrendadas,
          adminHoum: data.admin_houm,
          marketingAttribution: jsonAttribution,
        },
      });
    }
  } catch (e) {
    console.error("lead create error", e);
    return NextResponse.json({ error: "No pudimos guardar tu solicitud. Intenta de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
