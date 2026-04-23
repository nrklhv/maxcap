import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { importPropertyCsvText } from "@/lib/property-csv-import";

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Usá multipart/form-data con el campo file" },
      { status: 400 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el formulario" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Falta el archivo (campo file)" }, { status: 400 });
  }

  if (typeof (file as Blob).arrayBuffer !== "function") {
    return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
  }

  const blob = file as File;
  if (blob.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Archivo demasiado grande (máx. ${MAX_BYTES / (1024 * 1024)} MB)` },
      { status: 400 }
    );
  }

  let text: string;
  try {
    text = await blob.text();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo" }, { status: 400 });
  }

  const result = await importPropertyCsvText(text);
  return NextResponse.json(result);
}
