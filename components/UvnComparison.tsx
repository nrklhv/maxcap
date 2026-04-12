import type { ReactNode } from "react";

type UvnRow = {
  id: string;
  label: string;
  nueva: ReactNode;
  usada: ReactNode;
};

const UVN_ROWS: UvnRow[] = [
  {
    id: "cap",
    label: "Cap rate",
    nueva: (
      <>
        <span className="font-medium text-[#A32D2D]">3,6%</span>
        <br />
        <small className="text-[11px] text-gray-3">proyectado a 3 años</small>
      </>
    ),
    usada: (
      <>
        <span className="font-semibold text-green">Entre 4,5% y 5%</span>
        <br />
        <small className="text-[11px] text-green">rango referencial del piloto</small>
      </>
    ),
  },
  {
    id: "arriendo",
    label: "Arriendo mensual bruto",
    nueva: <span className="font-medium text-[#A32D2D]">7,50 UF</span>,
    usada: <span className="font-semibold text-green">10,21 UF</span>,
  },
  {
    id: "primer",
    label: "Primer arriendo",
    nueva: (
      <>
        <span className="font-medium text-[#A32D2D]">Mes 37–40</span>
        <br />
        <small className="text-[11px] text-gray-3">36 meses sin ingresos</small>
      </>
    ),
    usada: (
      <>
        <span className="font-semibold text-green">Día 1</span>
        <br />
        <small className="text-[11px] text-green">propiedad ya arrendada</small>
      </>
    ),
  },
  {
    id: "pie",
    label: "Pie",
    nueva: <span className="font-medium text-[#A32D2D]">36 cuotas durante la obra</span>,
    usada: <span className="font-semibold text-green">24 cuotas post escritura</span>,
  },
  {
    id: "riesgo-arr",
    label: "Riesgo arrendatario",
    nueva: <span className="font-medium text-[#A32D2D]">Por encontrar al entregar</span>,
    usada: <span className="font-semibold text-green">Historial verificado por Houm</span>,
  },
  {
    id: "renta-gar",
    label: "Renta garantizada",
    nueva: <span className="font-medium text-[#A32D2D]">No existe</span>,
    usada: <span className="font-semibold text-green">24 meses — Houm garantiza</span>,
  },
  {
    id: "riesgo-cred",
    label: "Riesgo crédito",
    nueva: (
      <>
        <span className="font-medium text-[#A32D2D]">Hipotecario en 3 años</span>
        <br />
        <small className="text-[11px] text-gray-3">condiciones desconocidas</small>
      </>
    ),
    usada: (
      <>
        <span className="font-semibold text-green">Aprobado hoy con el Banco Aliado</span>
        <br />
        <small className="text-[11px] text-green">condiciones conocidas</small>
      </>
    ),
  },
  {
    id: "comision",
    label: "Comisión de compra",
    nueva: <span className="text-gray-3">0% — inmobiliaria paga</span>,
    usada: <span className="text-gray-3">0% — institucional paga</span>,
  },
];

function TableRow({ label, nueva, usada }: { label: string; nueva: ReactNode; usada: ReactNode }) {
  return (
    <tr>
      <td className="border-b border-gray-1 px-5 py-3.5 text-[13px] text-gray-3">{label}</td>
      <td className="border-b border-gray-1 bg-[#F7F6FF] px-5 py-3.5 text-center text-[13.5px] font-medium">{nueva}</td>
      <td className="border-b border-gray-1 bg-[#FFF8F2] px-5 py-3.5 text-center text-[13.5px] font-medium">{usada}</td>
    </tr>
  );
}

type ScenarioRow = { id: string; label: string; value: ReactNode };

function MobileScenarioBlock({
  id,
  title,
  variant,
  rows,
  tirDisplay,
  tirFootnote,
}: {
  id: string;
  title: string;
  variant: "nueva" | "usada";
  rows: ScenarioRow[];
  tirDisplay: ReactNode;
  tirFootnote: string;
}) {
  const isNueva = variant === "nueva";
  const rowBg = isNueva ? "bg-[#F7F6FF]" : "bg-[#FFF8F2]";
  const tirBg = isNueva ? "bg-[#EEEDFE]" : "bg-orange-light";

  return (
    <section
      id={id}
      className="scroll-mt-24 overflow-hidden rounded-xl border border-gray-1 shadow-sm"
      aria-labelledby={`${id}-heading`}
    >
      <h3
        id={`${id}-heading`}
        className={`px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide ${
          isNueva ? "bg-purpleL text-[#3C3489]" : "bg-orange-light text-[#CC4E00]"
        }`}
      >
        {title}
      </h3>
      <dl className={`divide-y divide-gray-1/80 border-t border-gray-1/80 ${rowBg}`}>
        {rows.map((r) => (
          <div key={r.id} className="px-4 py-3">
            <dt className="mb-1.5 text-[12px] font-semibold text-dark">{r.label}</dt>
            <dd className="text-left text-[13.5px] leading-relaxed">{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className={`border-t border-gray-1 px-4 py-4 text-center ${tirBg}`}>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-3">TIR anual a 10 años</p>
        <div className={`font-serif text-3xl tracking-tight ${isNueva ? "text-[#534AB7]" : "text-orange"}`}>
          {tirDisplay}
        </div>
        <p className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${isNueva ? "text-[#534AB7]" : "text-orange"}`}>
          {tirFootnote}
        </p>
      </div>
    </section>
  );
}

export function UvnComparison() {
  const nuevaRows: ScenarioRow[] = UVN_ROWS.map((r) => ({ id: r.id, label: r.label, value: r.nueva }));
  const usadaRows: ScenarioRow[] = UVN_ROWS.map((r) => ({ id: r.id, label: r.label, value: r.usada }));

  return (
    <div className="mb-1 md:mb-2">
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-3" />
              <th className="rounded-t-[10px] bg-purpleL p-4 text-center text-[11px] font-semibold uppercase tracking-wide text-[#3C3489]">
                Propiedad nueva
              </th>
              <th className="rounded-t-[10px] bg-orange-light p-4 text-center text-[11px] font-semibold uppercase tracking-wide text-[#CC4E00]">
                Usada
              </th>
            </tr>
          </thead>
          <tbody>
            {UVN_ROWS.map((row) => (
              <TableRow key={row.id} label={row.label} nueva={row.nueva} usada={row.usada} />
            ))}
            <tr>
              <td className="border-b-0 px-5 pb-0 pt-5 text-sm font-semibold text-dark">TIR anual a 10 años</td>
              <td className="rounded-b-[10px] bg-[#EEEDFE] px-5 pb-5 pt-5 text-center font-serif text-[28px] text-[#534AB7]">
                7,9%
                <span className="mt-0.5 block font-sans text-[11px] font-semibold tracking-wide text-[#534AB7]">
                  nueva
                </span>
              </td>
              <td className="rounded-b-[10px] bg-orange-light px-5 pb-5 pt-5 text-center font-serif text-[28px] text-orange">
                10,0%
                <span className="mt-0.5 block font-sans text-[11px] font-semibold tracking-wide text-orange">
                  usada
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 md:hidden" aria-label="Comparación: escenario completo nuevo y luego usado">
        <nav
          className="flex flex-wrap gap-2 rounded-lg border border-gray-1 bg-cream px-2 py-2"
          aria-label="Ir a escenario"
        >
          <a
            href="#uvn-nueva"
            className="rounded-md bg-[#EEEDFE] px-3 py-1.5 text-center text-xs font-semibold text-[#3C3489] transition-colors hover:bg-purpleL"
          >
            Ver escenario · nueva
          </a>
          <a
            href="#uvn-usada"
            className="rounded-md bg-orange-light px-3 py-1.5 text-center text-xs font-semibold text-[#CC4E00] transition-colors hover:bg-orange-light/80"
          >
            Ver escenario · usada
          </a>
        </nav>

        <MobileScenarioBlock
          id="uvn-nueva"
          title="Propiedad nueva"
          variant="nueva"
          rows={nuevaRows}
          tirDisplay="7,9%"
          tirFootnote="nueva"
        />
        <MobileScenarioBlock
          id="uvn-usada"
          title="Usada"
          variant="usada"
          rows={usadaRows}
          tirDisplay="10,0%"
          tirFootnote="usada"
        />
      </div>
    </div>
  );
}
