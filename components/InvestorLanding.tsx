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

export function InvestorLanding() {
  const cupos = 75;
  const reservados = 100 - cupos;
  const barPct = Math.min(100, Math.max(0, reservados));

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
                100
              </div>
              <span className="text-xs font-medium tracking-wide text-orange-2">100 cupos · Lanzamiento exclusivo</span>
            </div>
            <h1 className="mb-3 max-w-5xl font-serif text-4xl leading-[1.06] tracking-tight text-white md:text-5xl xl:text-6xl 2xl:text-6xl">
              Invierte en propiedades usadas
              <br />
              <em className="block font-serif text-[1.12em] not-italic text-orange md:text-[1.08em]">sin poner pie.</em>
            </h1>
            <p className="max-w-5xl text-balance font-serif text-base font-normal leading-snug tracking-tight text-gray-2 md:text-lg md:leading-snug xl:text-xl">
              Rentabilidades <strong className="font-medium text-orange-2">30% más altas</strong> que en una propiedad
              nueva.
            </p>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-6 border-t border-white/10 bg-dark px-4 py-5 md:flex-nowrap md:px-10 md:py-5">
          <div className="min-w-0 shrink-0">
            <div className="font-serif text-lg tracking-tight text-white">Reserva tu cupo</div>
            <div className="mt-0.5 whitespace-nowrap text-xs text-gray-3">Solo 100 inversionistas entran al piloto</div>
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
              {reservados} de 100 reservados
            </div>
          </div>
          <div className="shrink-0 text-right text-xs text-gray-3">
            <b className="block text-xs font-semibold text-[#E35050]">¡Activo!</b>
            cerrando rápido
          </div>
        </div>

        <section className="bg-white px-4 py-12 md:px-10 md:py-16" id="pilares">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-orange">Por qué este modelo es diferente</div>
          <h2 className="mb-2 font-serif text-3xl tracking-tight text-dark md:text-[clamp(24px,2.2vw+14px,52px)]">
            4 condiciones que ninguna
            <br />
            propiedad nueva te ofrece.
          </h2>
          <p className="mb-10 max-w-lg text-sm leading-relaxed text-gray-3">
            Disponibles solo en este piloto de 100 cupos, en alianza con Houm, Renta Capital y Banco Aliado.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PilarCard
              variant="orange"
              bgNum="01"
              numLabel="Pilar 01"
              title="Invierte sin poner pie"
              statValue="0 UF"
              statLabel={
                <>
                  desembolso
                  <br />
                  inicial
                </>
              }
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M10 2L3 5.5V10.5c0 3.5 3 6.5 7 7 4-.5 7-3.5 7-7V5.5L10 2z" stroke="#7A6E68" strokeWidth="1.5" />
                  <path d="M7 10l2 2 4-4" stroke="#7A6E68" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
            >
              El pie se paga en 24 cuotas mensuales post compraventa — no el día de la escritura. Y el arriendo que
              recibes desde el día 1 cubre ese pago mes a mes. Sin estrés de liquidez.
            </PilarCard>
            <PilarCard
              variant="orange"
              bgNum="02"
              numLabel="Pilar 02"
              title="Financiamiento a la medida con el Banco Aliado"
              statValue="90%"
              statLabel={
                <>
                  financiamiento
                  <br />+ 24m gracia
                </>
              }
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <rect x="3" y="7" width="14" height="10" rx="2" stroke="#7A6E68" strokeWidth="1.5" />
                  <path d="M7 7V5a3 3 0 016 0v2" stroke="#7A6E68" strokeWidth="1.5" />
                </svg>
              }
            >
              El Banco Aliado entrega financiamiento hasta el 90% del valor. Los primeros 24 meses pagas solo el 50% del dividendo
              — el arriendo cubre esa cuota y tu flujo mensual neto es casi cero.
            </PilarCard>
            <PilarCard
              variant="orange"
              bgNum="03"
              numLabel="Pilar 03"
              title="Renta garantizada los primeros 24 meses"
              statValue="24 m"
              statLabel={
                <>
                  renta asegurada
                  <br />
                  por Houm
                </>
              }
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <circle cx="10" cy="10" r="7" stroke="#7A6E68" strokeWidth="1.5" />
                  <path d="M10 7v3l2.5 2" stroke="#7A6E68" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
            >
              Houm garantiza el arriendo los primeros 24 meses. Estos flujos, más el descuento en el dividendo, te
              permiten pagar el pie sin estrés financiero. Si el arrendatario sale, Houm paga igual.
            </PilarCard>
            <PilarCard
              variant="orange"
              bgNum="04"
              numLabel="Pilar 04"
              title="Activo superior — renta conocida desde hoy"
              statValue="+4,5%"
              statLabel={
                <>
                  cap rate real vs
                  <br />
                  ~3% en nuevas
                </>
              }
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M4 14L8 9l3 3 5-6" stroke="#7A6E68" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            >
              Cap rates por sobre 4,5% verificados hoy en contrato. Versus propiedades nuevas que pueden entregar ~3%
              — y solo en 3 años. La renta es conocida, no una proyección.
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
              <span className="font-serif text-3xl tracking-tight text-orange">+2,1 pp</span>
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
              como arriendo desde el día 1 — y Houm lo garantiza los primeros 24 meses.
            </Insight>
            <Insight title="El riesgo de crédito en 3 años es real">
              Firmas la promesa hoy pero el hipotecario se aprueba en 3 años — con tasas, condiciones e ingresos
              desconocidos. En la usada el crédito del Banco Aliado se aprueba hoy, con las condiciones de hoy.
            </Insight>
            <Insight title="Cap rate conocido vs proyectado">
              En la usada trabajamos con un cap rate entre 4,5% y 5% según el contrato de arriendo vigente — no es una
              proyección a futuro. El 3,6% de la nueva es una estimación a 3 años en un mercado que puede cambiar.
            </Insight>
          </div>
        </section>

        <section className="relative overflow-hidden bg-dark px-4 py-16 md:px-10 md:py-20" id="alianza">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(255,103,1,0.1)_0%,transparent_65%)]"
            aria-hidden
          />
          <div className="relative z-[1]">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-orange-2">La super alianza</div>
            <h2 className="mb-2 font-serif text-3xl tracking-tight text-white md:text-[clamp(24px,2.2vw+14px,52px)]">
              Tres líderes.
              <br />
              Un solo producto.
            </h2>
            <p className="mb-12 max-w-lg text-sm leading-relaxed text-gray-2">
              Cada empresa aporta lo que las otras no tienen. Juntas hacen posible algo que no existía en el mercado
              chileno.
            </p>

            <div className="mb-12">
              <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/5 sm:hidden">
                <div className="px-5 py-4">
                  <div className="text-sm font-semibold text-white">Houm</div>
                  <div className="mt-0.5 text-xs text-gray-3">Administración + garantía</div>
                </div>
                <div className="px-5 py-4">
                  <div className="text-sm font-semibold text-white">Renta Capital</div>
                  <div className="mt-0.5 text-xs text-gray-3">Canal de ventas</div>
                </div>
                <div className="px-5 py-4">
                  <div className="text-sm font-semibold text-white">Banco Aliado</div>
                  <div className="mt-0.5 text-xs text-gray-3">Financiamiento</div>
                </div>
              </div>

              <div className="hidden overflow-hidden rounded-xl border border-white/10 sm:flex sm:flex-row">
                <div className="flex flex-1 items-center gap-2.5 bg-white/5 px-5 py-4 sm:rounded-l-xl">
                  <div>
                    <div className="text-sm font-semibold text-white">Houm</div>
                    <div className="mt-0.5 text-xs text-gray-3">Administración + garantía</div>
                  </div>
                </div>
                <div className="flex w-8 shrink-0 items-center justify-center self-stretch bg-orange text-sm font-semibold text-white">
                  +
                </div>
                <div className="flex flex-1 items-center bg-white/5 px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-white">Renta Capital</div>
                    <div className="mt-0.5 text-xs text-gray-3">Canal de ventas</div>
                  </div>
                </div>
                <div className="flex w-8 shrink-0 items-center justify-center self-stretch bg-orange text-sm font-semibold text-white">
                  +
                </div>
                <div className="flex flex-1 items-center bg-white/5 px-5 py-4 sm:rounded-r-xl">
                  <div>
                    <div className="text-sm font-semibold text-white">Banco Aliado</div>
                    <div className="mt-0.5 text-xs text-gray-3">Financiamiento</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <EmpresaCard variant="houm" />
              <EmpresaCard variant="renta" />
              <EmpresaCard variant="bci" />
            </div>

            <div className="mt-10 flex items-center gap-6 rounded-xl border border-orange/25 bg-orange/10 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange text-lg text-white">
                ✦
              </div>
              <p className="text-sm leading-relaxed text-white">
                Juntos tienen el activo, el canal de ventas y el financiamiento.{" "}
                <strong className="text-orange-2">Lo que no existía por separado, existe unido.</strong>
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

function EmpresaCard({ variant }: { variant: "houm" | "renta" | "bci" }) {
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
    bci: {
      top: "before:bg-[#F5A623]",
      logo: "text-[#F5A623]",
      badge: "bg-[#F5A623]/12 text-[#D4890A]",
    },
  }[variant];

  const body =
    variant === "houm" ? (
      <>
        Líder en administración de propiedades en <strong className="text-white">Chile, Colombia y México</strong>.{" "}
        <strong className="text-white">Garantiza el arriendo los primeros 24 meses</strong> y certifica el historial
        de cada arrendatario antes de la venta.
      </>
    ) : variant === "renta" ? (
      <>
        Fundada por Antonio Roa, cofundador de Buydepa — <strong className="text-white">20 años de experiencia</strong>{" "}
        en el mercado inmobiliario de inversión.
      </>
    ) : (
      <>
        <strong className="text-white">Financia hasta el 90% del valor</strong> con tasa 4,5% UF a 30 años. Los primeros
        24 meses solo pagas el 50% del dividendo — el arriendo cubre esa cuota.
      </>
    );

  const head =
    variant === "houm" ? (
      <>
        <div className={`font-serif text-2xl tracking-tight ${styles.logo}`}>houm</div>
        <div className={`mt-2 inline-block text-xs font-semibold uppercase tracking-wide ${styles.badge}`}>
          Administración · Garantía · Escala
        </div>
        <div className="mt-4 font-serif text-4xl tracking-tight text-white">20.000+</div>
        <div className="mb-4 text-xs text-gray-3">propiedades administradas</div>
      </>
    ) : variant === "renta" ? (
      <>
        <div className={`font-serif text-2xl tracking-tight ${styles.logo}`}>Renta Capital</div>
        <div className={`mt-2 inline-block text-xs font-semibold uppercase tracking-wide ${styles.badge}`}>
          Canal de ventas · Inversionistas
        </div>
        <div className="mt-4 font-serif text-4xl tracking-tight text-white">+UF 3M</div>
        <div className="mb-4 text-xs text-gray-3">en ventas de propiedades de inversión</div>
      </>
    ) : (
      <>
        <div className={`font-serif text-lg leading-tight tracking-tight ${styles.logo}`}>Banco Aliado</div>
        <div className={`mt-2 inline-block text-xs font-semibold uppercase tracking-wide ${styles.badge}`}>
          Financiamiento
        </div>
        <div className="mt-4 font-serif text-4xl tracking-tight text-white">90%</div>
        <div className="mb-4 text-xs text-gray-3">financiamiento + 24 meses de gracia</div>
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
