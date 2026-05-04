"use client";

import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Logo } from "./Logo";
import { FormInversionista } from "./FormInversionista";
import { PilarCard } from "./PilarCard";
import { StepRow, StepsWrap } from "./StepRow";
import { FaqList } from "./FaqItem";
import { MobileLeadBar } from "./MobileLeadBar";
import { UvnComparison } from "./UvnComparison";
import { investorFaqItems } from "@/lib/faqInvestor";
import { CLUB_TOTAL_SLOTS } from "@/lib/site";
import { getClubPhaseLabel } from "@/lib/clubPhase";

export function InvestorLanding() {
  const cupos = 75;
  const reservados = CLUB_TOTAL_SLOTS - cupos;
  const barPct = Math.min(100, Math.max(0, reservados));
  const phaseLabel = getClubPhaseLabel();
  const phaseColorClass =
    phaseLabel.emphasisColor === "red"
      ? "text-[#E35050]"
      : phaseLabel.emphasisColor === "gray"
        ? "text-gray-3"
        : "text-orange-2";

  return (
    <>
      <Header variant="inversionista" />
      <div className="md:mr-[420px] md:pb-0 xl:mr-[480px] 2xl:mr-[520px] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <section
          className="hero-animate relative overflow-hidden bg-dark px-4 pb-10 pt-9 md:px-10 md:pb-10 md:pt-11"
          id="top"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_10%_60%,rgba(255,103,1,0.13)_0%,transparent_65%)]"
            aria-hidden
          />
          <div className="relative z-[1]">
            <div className="mb-8 flex items-center gap-2.5">
              <Logo size="lg" />
            </div>
            <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-orange/35 bg-orange/10 py-1 pl-1 pr-3.5">
              <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-orange text-xs font-semibold text-white">
                {CLUB_TOTAL_SLOTS}
              </div>
              <span className="text-xs font-medium tracking-wide text-orange-2">
                Club de Inversionistas Calificados · {CLUB_TOTAL_SLOTS} cupos
              </span>
            </div>
            <h1 className="mb-3 max-w-5xl font-serif text-4xl leading-[1.06] tracking-tight text-white md:text-5xl xl:text-6xl 2xl:text-6xl">
              Juntos compramos
              <br />
              <em className="block font-serif text-[1.12em] not-italic text-orange md:text-[1.08em]">mejor.</em>
            </h1>
            <p className="max-w-5xl text-balance font-serif text-base font-normal leading-snug tracking-tight text-gray-2 md:text-lg md:leading-snug xl:text-xl">
              <span className="italic text-gray-3">Solos, somos un cliente más.</span> Juntos somos{" "}
              <strong className="font-medium text-orange-2">{CLUB_TOTAL_SLOTS} inversionistas calificados</strong>{" "}
              con poder de negociación para acceder a propiedades usadas con cap rate sobre{" "}
              <strong className="font-medium text-orange-2">5%</strong> y comisiones cero.
            </p>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-6 border-t border-white/10 bg-dark px-4 py-5 md:flex-nowrap md:px-10 md:py-5">
          <div className="min-w-0 shrink-0">
            <div className="font-serif text-lg tracking-tight text-white">Tu cupo en el Club</div>
            <div className="mt-0.5 whitespace-nowrap text-xs text-gray-3">
              Solo {CLUB_TOTAL_SLOTS} inversionistas entran al lanzamiento
            </div>
          </div>
          <div className="shrink-0">
            <div className="font-serif text-3xl leading-none text-orange">{cupos}</div>
            <div className="mt-0.5 text-xs text-gray-3">cupos libres</div>
          </div>
          <div className="min-w-[140px] flex-1 basis-full md:basis-auto">
            <div className="h-[5px] overflow-hidden rounded bg-white/10">
              <div
                className="h-full rounded bg-orange transition-[width] duration-[1.4s] ease-out"
                style={{ width: `${barPct}%` }}
              />
            </div>
            <div className="mt-1 text-right text-xs text-gray-3">
              {reservados} de {CLUB_TOTAL_SLOTS} reservados
            </div>
          </div>
          <div
            className="shrink-0 text-right text-xs text-gray-3"
            aria-label={phaseLabel.long}
          >
            <b className={`block text-xs font-semibold ${phaseColorClass}`}>{phaseLabel.short}</b>
          </div>
        </div>

        <section className="bg-white px-4 py-12 md:px-10 md:py-16" id="pilares">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-orange">Por qué este modelo es diferente</div>
          <h2 className="mb-2 font-serif text-3xl tracking-tight text-dark md:text-[clamp(24px,2.2vw+14px,52px)]">
            4 condiciones que ninguna
            <br />
            inversión inmobiliaria te ofrece.
          </h2>
          <p className="mb-10 max-w-xl text-sm leading-relaxed text-gray-3">
            Cuatro ventajas que solo se logran cuando {CLUB_TOTAL_SLOTS} inversionistas calificados compran juntos.
            MaxRent es una iniciativa de Houm con Renta Capital.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PilarCard
              variant="orange"
              bgNum="01"
              numLabel="Pilar 01"
              title="Compramos en bloque, conseguimos mejor precio"
              statValue="+5%"
              statLabel={
                <>
                  cap rate
                  <br />
                  objetivo
                </>
              }
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M4 14L8 9l3 3 5-6" stroke="#7A6E68" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            >
              Como Club de {CLUB_TOTAL_SLOTS} inversionistas calificados, negociamos directo con operadores
              institucionales para acceder a precios y cap rates que un comprador individual no consigue.
              Meta: cap rate real sobre 5%, no proyectado a tres años.
            </PilarCard>
            <PilarCard
              variant="orange"
              bgNum="02"
              numLabel="Pilar 02"
              title="Sin comisión de compra y pie en cuotas"
              statValue="0%"
              statLabel={
                <>
                  comisión + pie
                  <br />
                  diferido
                </>
              }
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M10 2L3 5.5V10.5c0 3.5 3 6.5 7 7 4-.5 7-3.5 7-7V5.5L10 2z" stroke="#7A6E68" strokeWidth="1.5" />
                  <path d="M7 10l2 2 4-4" stroke="#7A6E68" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
            >
              La comisión de compra es 0% — algo único en propiedades usadas. El pie se paga en cuotas
              mensuales post escritura, y el arriendo que recibes desde el día uno cubre ese pago. Tu efectivo
              no se queda sentado.
            </PilarCard>
            <PilarCard
              variant="orange"
              bgNum="03"
              numLabel="Pilar 03"
              title="Rentabilidad real desde el día uno"
              statValue="+30%"
              statLabel={
                <>
                  rentabilidad
                  <br />
                  vs nueva
                </>
              }
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <circle cx="10" cy="10" r="7" stroke="#7A6E68" strokeWidth="1.5" />
                  <path d="M10 7v3l2.5 2" stroke="#7A6E68" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
            >
              Las propiedades del pool ya están arrendadas y operando. Conocemos el contrato vigente,
              al arrendatario y los costos. No hay proyección a tres años: la renta es conocida y entra
              desde la escritura, con cap rate sobre el 5%.
            </PilarCard>
            <PilarCard
              variant="orange"
              bgNum="04"
              numLabel="Pilar 04"
              title="Tu propiedad dentro de un pool diversificado"
              statValue="Pool"
              statLabel={
                <>
                  vacancia y morosidad
                  <br />
                  diversificadas
                </>
              }
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <circle cx="5" cy="5" r="2" stroke="#7A6E68" strokeWidth="1.5" />
                  <circle cx="15" cy="5" r="2" stroke="#7A6E68" strokeWidth="1.5" />
                  <circle cx="5" cy="15" r="2" stroke="#7A6E68" strokeWidth="1.5" />
                  <circle cx="15" cy="15" r="2" stroke="#7A6E68" strokeWidth="1.5" />
                  <path
                    d="M5 7v6 M15 7v6 M7 5h6 M7 15h6"
                    stroke="#7A6E68"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              }
            >
              Tu inversión queda en un pool administrado por Houm. Si tu arrendatario se atrasa, sale o
              hay gastos extras, el pool absorbe el impacto y tu flujo se mantiene estable. Inversión
              inmobiliaria con la previsibilidad de una financiera.
            </PilarCard>
          </div>
        </section>

        <section className="bg-white px-4 py-16 md:px-10 md:py-20" id="uvn">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-orange">Usada vs nueva — los números</div>
          <h2 className="mb-2 font-serif text-3xl tracking-tight text-dark md:text-[clamp(24px,2.2vw+14px,52px)]">
            El mismo precio.
            <br />
            No la misma rentabilidad.
          </h2>
          <p className="mb-10 max-w-xl text-sm leading-relaxed text-gray-3">
            Mismos 2.500 UF, mismo banco, misma cuota. La diferencia está en el cap rate real, en cuándo llega el
            arriendo y en cuánto ganas al final.
          </p>

          <UvnComparison />

          <p className="mb-10 mt-1.5 max-w-2xl text-xs leading-relaxed text-gray-3 md:mb-12 md:mt-2">
            Cifras con fines ilustrativos y supuestos de mercado; no constituyen oferta ni garantía de rentabilidad y
            pueden variar en cada operación.
          </p>

          <div className="mb-12 flex flex-wrap items-center gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange/30 bg-orange-light py-2.5 pl-5 pr-5">
              <span className="font-serif text-3xl tracking-tight text-orange">+3,1 pp</span>
              <span className="max-w-[200px] text-sm leading-snug text-[#CC4E00]">
                más rentabilidad anual
                <br />
                durante 10 años
              </span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-gray-3">
              Sobre una inversión de 2.500 UF a 10 años, esa diferencia se traduce en cientos de UF adicionales en tu
              patrimonio.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Insight title="La plusvalía parte de una base real">
              La nueva pierde la prima de &quot;nuevo&quot; al entregarse y entra a competir en el mercado secundario a
              precios más bajos. La usada ya está valorizada al precio real de mercado — sin ajuste sorpresa al vender.
            </Insight>
            <Insight title="36 meses sin arriendo es un costo real">
              En una propiedad nueva pagas el pie durante 3 años sin recibir nada. En la usada ese mismo dinero llega
              como arriendo desde el día 1, y el pool absorbe vacancia o atrasos para que tu flujo se mantenga estable.
            </Insight>
            <Insight title="Solo entran propiedades con cap rate sobre 5%">
              Como Club, filtramos lo que entra al pool. Solo aceptamos propiedades con cap rate verificable sobre 5% en
              contrato vigente. Una propiedad nueva con +5% es prácticamente imposible — el cap rate típico es entre
              3,0% y 3,6% proyectado a tres años.
            </Insight>
            <Insight title="Cap rate conocido vs proyectado">
              En la usada trabajamos con cap rate verificable en el contrato de arriendo vigente — no proyección. El
              3,0%–3,6% de la nueva es una estimación a 3 años en un mercado que puede cambiar.
            </Insight>
          </div>
        </section>

        <section className="relative overflow-hidden bg-dark px-4 py-16 md:px-10 md:py-20" id="alianza">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(255,103,1,0.1)_0%,transparent_65%)]"
            aria-hidden
          />
          <div className="relative z-[1]">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-orange-2">
              Una iniciativa de Houm
            </div>
            <h2 className="mb-2 font-serif text-3xl tracking-tight text-white md:text-[clamp(24px,2.2vw+14px,52px)]">
              Houm crea el Club.
              <br />
              Renta Capital lo lleva al inversionista.
            </h2>
            <p className="mb-12 max-w-2xl text-sm leading-relaxed text-gray-2">
              MaxRent es la primera apuesta de Houm para que invertir en propiedades usadas sea masivo, con la red de
              gestión que ya administra <strong className="text-white">+20.000 propiedades</strong> en Chile, Colombia
              y México.
            </p>

            <div className="mb-12">
              <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/5 sm:hidden">
                <div className="px-5 py-4">
                  <div className="text-sm font-semibold text-white">Houm</div>
                  <div className="mt-0.5 text-xs text-gray-3">Crea y administra el Club</div>
                </div>
                <div className="px-5 py-4">
                  <div className="text-sm font-semibold text-white">Renta Capital</div>
                  <div className="mt-0.5 text-xs text-gray-3">Canal de inversionistas</div>
                </div>
              </div>

              <div className="hidden overflow-hidden rounded-xl border border-white/10 sm:flex sm:flex-row">
                <div className="flex flex-1 items-center gap-2.5 bg-white/5 px-5 py-4 sm:rounded-l-xl">
                  <div>
                    <div className="text-sm font-semibold text-white">Houm</div>
                    <div className="mt-0.5 text-xs text-gray-3">Crea y administra el Club</div>
                  </div>
                </div>
                <div className="flex w-8 shrink-0 items-center justify-center self-stretch bg-orange text-sm font-semibold text-white">
                  +
                </div>
                <div className="flex flex-1 items-center bg-white/5 px-5 py-4 sm:rounded-r-xl">
                  <div>
                    <div className="text-sm font-semibold text-white">Renta Capital</div>
                    <div className="mt-0.5 text-xs text-gray-3">Canal de inversionistas</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <EmpresaCard variant="houm" />
              <EmpresaCard variant="renta" />
            </div>

            <div className="mt-10 flex items-center gap-6 rounded-xl border border-orange/25 bg-orange/10 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange text-lg text-white">
                ✦
              </div>
              <p className="text-sm leading-relaxed text-white">
                Houm aporta el activo y la administración, Renta Capital la asesoría experta.{" "}
                <strong className="text-orange-2">
                  Lo que no existía por separado, existe unido en el Club MaxRent.
                </strong>
              </p>
            </div>
          </div>
        </section>

        <section className="bg-cream px-4 py-16 md:px-10 md:py-20" id="como">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-orange">Cómo funciona</div>
          <h2 className="mb-2 font-serif text-3xl tracking-tight text-dark md:text-[clamp(24px,2.2vw+14px,52px)]">
            De tu primer contacto
            <br />a tu primera renta.
          </h2>
          <p className="mb-14 max-w-xl text-sm leading-relaxed text-gray-3">
            5 pasos simples — un especialista te acompaña en cada uno.
          </p>
          <StepsWrap>
            <StepRow
              step={1}
              tag="Paso 01"
              title="Deja tus datos de contacto"
              description="Completa el formulario en esta página. Solo necesitamos tu nombre, email y WhatsApp — sin compromiso, sin costo."
            />
            <StepRow
              step={2}
              tag="Paso 02"
              title="Asesoría financiera personalizada"
              description="Un especialista se contacta contigo en menos de 24 horas."
            />
            <StepRow
              step={3}
              tag="Paso 03"
              title="Acompañamiento en el crédito hipotecario"
              description={
                <>
                  Te acompañamos en la <strong>aprobación del crédito hipotecario con el Banco Aliado</strong> — hasta el 90% de
                  financiamiento, con 24 meses de gracia.
                </>
              }
            />
            <StepRow step={4} tag="Paso 04" title="Pago de reserva de propiedad" description="Una vez aprobado el crédito, reservas la propiedad que elegiste." />
            <StepRow
              step={5}
              tag="Paso 05"
              title="Firma de la compraventa"
              description={
                <>
                  Firmas la escritura de compraventa. <strong>Desde ese día recibes el arriendo</strong> — la propiedad
                  ya está ocupada y Houm administra todo.
                </>
              }
            />
            <StepRow
              step={6}
              tag="Paso 06 · Tu inversión trabaja"
              title="Propiedad bajo administración Houm — renta asegurada 24 meses"
              description={
                <>
                  Houm administra tu propiedad y <strong>garantiza el pago del arriendo los primeros 24 meses</strong>.
                  Tu inversión genera ingresos desde el primer día.
                </>
              }
              isLast
            />
          </StepsWrap>
        </section>

        <section className="bg-cream px-4 py-16 md:px-10 md:py-20" id="faq">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-orange">Preguntas frecuentes</div>
          <h2 className="mb-2 font-serif text-3xl tracking-tight text-dark md:text-[clamp(24px,2.2vw+14px,52px)]">
            Todo lo que necesitas saber.
          </h2>
          <p className="mb-10 max-w-xl text-sm leading-relaxed text-gray-3">
            Si tienes alguna duda adicional, un especialista la responde en tu primera llamada.
          </p>
          <FaqList items={investorFaqItems} accent="orange" />
        </section>

        <aside
          className="relative z-10 w-full scroll-mt-20 border-t border-gray-1 bg-white px-5 py-6 md:fixed md:right-0 md:top-14 md:flex md:h-[calc(100vh-3.5rem)] md:max-w-[420px] md:flex-col md:justify-center md:border-l md:border-t-0 md:scroll-mt-0 md:px-7 md:py-6 md:shadow-[-6px_0_40px_rgba(0,0,0,0.14)] xl:max-w-[480px] xl:px-9 xl:py-8 2xl:max-w-[520px] 2xl:px-10"
          id="form"
        >
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-[1] hidden h-1 bg-orange md:block" aria-hidden />
          <div className="relative max-h-[min(100vh,900px)] overflow-y-auto md:max-h-full md:py-3">
            <FormInversionista onReserved={() => {}} />
          </div>
        </aside>
      </div>

      <MobileLeadBar variant="inversionista" />
      <Footer variant="inversionista" />
    </>
  );
}

function Insight({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border-[1.5px] border-gray-1 bg-cream p-5">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-light">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M8 2L2 5V9c0 2.5 2.5 4.5 6 5 3.5-.5 6-2.5 6-5V5L8 2z" stroke="#FF6701" strokeWidth="1.2" />
        </svg>
      </div>
      <h4 className="mb-1.5 text-sm font-semibold text-dark">{title}</h4>
      <p className="text-sm leading-relaxed text-gray-3">{children}</p>
    </div>
  );
}

function EmpresaCard({ variant }: { variant: "houm" | "renta" }) {
  const styles = {
    houm: {
      top: "before:bg-orange",
      logo: "text-orange",
      badge: "bg-orange/15 text-orange-2",
    },
    renta: {
      top: "before:bg-teal-2",
      logo: "text-teal-2",
      badge: "bg-teal-2/10 text-[#9FE1CB]",
    },
  }[variant];

  const body =
    variant === "houm" ? (
      <>
        Líder en administración de propiedades en <strong className="text-white">Chile, Colombia y México</strong>.
        MaxRent es una iniciativa de Houm: certifican el inventario, gestionan el{" "}
        <strong className="text-white">pool de propiedades del Club</strong> tras la escritura, y respaldan la
        operación con su red de +20.000 unidades.
      </>
    ) : (
      <>
        Fundada por Antonio Roa, cofundador de Buydepa — <strong className="text-white">20 años de experiencia</strong>{" "}
        en el mercado inmobiliario de inversión. Cada inversionista del Club es{" "}
        <strong className="text-white">acompañado por un especialista</strong> de Renta Capital, desde la evaluación
        hasta la firma.
      </>
    );

  const head =
    variant === "houm" ? (
      <>
        <div className={`font-serif text-2xl tracking-tight ${styles.logo}`}>houm</div>
        <div className={`mt-2 inline-block text-xs font-semibold uppercase tracking-wide ${styles.badge}`}>
          Crea el Club · Administra el pool
        </div>
        <div className="mt-4 font-serif text-4xl tracking-tight text-white">20.000+</div>
        <div className="mb-4 text-xs text-gray-3">propiedades administradas</div>
      </>
    ) : (
      <>
        <div className={`font-serif text-2xl tracking-tight ${styles.logo}`}>Renta Capital</div>
        <div className={`mt-2 inline-block text-xs font-semibold uppercase tracking-wide ${styles.badge}`}>
          Canal de inversionistas · Asesoría
        </div>
        <div className="mt-4 font-serif text-4xl tracking-tight text-white">+UF 3M</div>
        <div className="mb-4 text-xs text-gray-3">en ventas de propiedades de inversión</div>
      </>
    );

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-8 transition-colors before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:content-[''] hover:border-orange/40 hover:bg-white/[0.07] ${styles.top}`}
    >
      {head}
      <div className="mb-4 h-px bg-white/10" />
      <div className="text-sm leading-relaxed text-gray-2">{body}</div>
    </div>
  );
}
