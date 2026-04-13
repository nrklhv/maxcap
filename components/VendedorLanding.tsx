"use client";

import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { FormVendedor } from "./FormVendedor";
import { PilarCard } from "./PilarCard";
import { FaqList } from "./FaqItem";
import { Calculadora } from "./Calculadora";
import { MobileLeadBar } from "./MobileLeadBar";
import { vendedorFaqItems } from "@/lib/faqVendedor";

export function VendedorLanding() {
  return (
    <>
      <Header variant="vendedor" />
      <div className="md:mr-[420px] md:pb-0 xl:mr-[480px] 2xl:mr-[520px] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <section
          className="hero-animate-vend relative overflow-hidden bg-dark px-4 pb-10 pt-9 md:px-10 md:pb-11 md:pt-12"
          id="top"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_8%_55%,rgba(15,110,86,0.18)_0%,transparent_65%)]"
            aria-hidden
          />
          <div className="relative z-[1]">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-orange/30 bg-orange/10 py-1 pl-2 pr-3.5">
              <div className="h-2 w-2 animate-pulseDot rounded-full bg-orange" />
              <span className="text-xs font-medium tracking-wide text-orange-2">
                Piloto en curso · Segundo lanzamiento próximo
              </span>
            </div>
            <h1 className="mb-3 max-w-5xl font-serif tracking-tight">
              <span className="block text-4xl font-medium leading-[1.06] text-teal-2 md:text-5xl xl:text-6xl 2xl:text-6xl">
                Le damos liquidez
              </span>
              <span className="mt-2 block font-serif text-3xl font-normal leading-snug text-white md:mt-2.5 md:text-4xl xl:text-5xl 2xl:text-5xl">
                a tu propiedad.
              </span>
            </h1>
            <p className="max-w-lg font-serif text-base font-normal leading-snug tracking-tight text-gray-2 md:text-lg xl:max-w-2xl xl:text-xl">
              Vendemos tu propiedad a inversionistas calificados —{" "}
              <strong className="font-medium text-[#9FE1CB]">
                canal exclusivo, sin portales, sin complicaciones.
              </strong>{" "}
              Tú recibes el precio completo.
            </p>
            <div className="mt-8 max-w-lg rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-2">Sobre el piloto</div>
              <p className="text-sm leading-relaxed text-gray-2">
                El primer lanzamiento ya está en marcha con una cartera de propiedades seleccionadas. Si tu propiedad
                califica, <strong className="font-medium text-white">inscríbete ahora para ser considerado en el segundo lanzamiento.</strong>
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 md:px-10 md:py-[4.5rem]" id="requisitos">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal">Lo que necesitamos de ti</div>
          <h2 className="mb-2 font-serif text-3xl tracking-tight text-dark md:text-[clamp(24px,2.2vw+14px,52px)]">
            4 condiciones para
            <br />
            calificar al programa.
          </h2>
          <p className="mb-10 max-w-lg text-sm leading-relaxed text-gray-3">
            Son las mismas condiciones que hacen atractiva la propiedad para el inversionista. Si las cumples, tienes un
            comprador.
          </p>
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <PilarCard
              variant="teal"
              bgNum="01"
              numLabel="Condición 01"
              tag="Base del modelo"
              title="Administrada por Houm"
              icon={
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M10 2L3 5.5V10.5c0 3.5 3 6.5 7 7 4-.5 7-3.5 7-7V5.5L10 2z" stroke="#0F6E56" strokeWidth="1.5" />
                  <path d="M7 10l2 2 4-4" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
            >
              La administración de Houm garantiza al inversionista la operación y el historial del arrendatario. Si aún
              no tienes administración con Houm, podemos coordinar el traspaso antes de la venta.
            </PilarCard>
            <PilarCard
              variant="teal"
              bgNum="02"
              numLabel="Condición 02"
              tag="Si no está arrendada, te ayudamos"
              title="Debe estar arrendada"
              icon={
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <circle cx="10" cy="10" r="7" stroke="#0F6E56" strokeWidth="1.5" />
                  <path d="M10 7v3l2.5 2" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
            >
              El inversionista compra porque recibe arriendo desde el día 1. Si tu propiedad está vacía, Houm y Renta
              Capital coordinan el arriendo antes de salir al mercado.
            </PilarCard>
            <PilarCard
              variant="teal"
              bgNum="03"
              numLabel="Condición 03"
              tag="Precio con cap rate atractivo"
              title="Cap rate ≥ 4,5%"
              icon={
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M4 14L8 9l3 3 5-6" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            >
              El inversionista compra por rentabilidad. Te ayudamos a valorizar la propiedad para que el precio sea
              justo para ti y atractivo para el comprador.
            </PilarCard>
            <PilarCard
              variant="teal"
              bgNum="04"
              numLabel="Condición 04"
              tag="Pie diferido en cuotas"
              title="10% del pie en 24 cuotas post escritura"
              icon={
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <rect x="3" y="7" width="14" height="10" rx="2" stroke="#0F6E56" strokeWidth="1.5" />
                  <path d="M7 7V5a3 3 0 016 0v2" stroke="#0F6E56" strokeWidth="1.5" />
                </svg>
              }
            >
              El 90% lo recibes al contado el día de la escritura vía el Banco Aliado. El 10% restante llega en 24 cuotas garantizadas
              por Houm — tú recibes el 100% sin riesgo de cobranza.
            </PilarCard>
          </div>
        </section>

        <section className="relative overflow-hidden bg-dark px-4 py-16 md:px-10 md:py-[4.5rem]" id="porque">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_80%_50%,rgba(15,110,86,0.12)_0%,transparent_65%)]"
            aria-hidden
          />
          <div className="relative z-[1]">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-2">Por qué lo logramos</div>
            <h2 className="mb-10 font-serif text-3xl tracking-tight text-white md:text-[clamp(24px,2.2vw+14px,52px)]">
              El canal que ningún corredor
              <br />
              tradicional tiene.
            </h2>
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
              <StatCard
                stat="+UF 3M"
                label="en ventas de propiedades de inversión"
                body={
                  <>
                    <strong className="text-white">Renta Capital</strong> tiene acceso directo al segmento que busca
                    exactamente este activo.
                  </>
                }
              />
              <StatCard
                stat={
                  <>
                    20.000<span className="text-[22px]">+</span>
                  </>
                }
                label="propiedades administradas regionalmente"
                body={
                  <>
                    <strong className="text-white">Houm</strong> conoce cada propiedad que administra — arrendatario,
                    historial de pago, estado del activo.
                  </>
                }
              />
              <StatCard
                stat="90%"
                label="financiamiento del Banco Aliado al día de la escritura"
                body={
                  <>
                    <strong className="text-white">El Banco Aliado</strong> financia al comprador en el acto — tú recibes el 90% el
                    día de la escritura.
                  </>
                }
              />
            </div>
          </div>
        </section>

        <Calculadora />

        <section className="bg-white px-4 py-16 md:px-10 md:py-[4.5rem]" id="faq">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal">Preguntas frecuentes</div>
          <h2 className="mb-2 font-serif text-3xl tracking-tight text-dark md:text-[clamp(24px,2.2vw+14px,52px)]">
            Lo que nos preguntan los propietarios.
          </h2>
          <p className="mb-10 max-w-lg text-sm leading-relaxed text-gray-3">
            Si tienes alguna duda adicional, un especialista te la responde en la primera llamada.
          </p>
          <FaqList items={vendedorFaqItems} accent="teal" />
        </section>

        <Footer variant="vendedor" />

        <aside
          className="relative z-10 w-full scroll-mt-20 border-t border-gray-1 bg-white px-5 py-6 md:fixed md:right-0 md:top-14 md:flex md:h-[calc(100vh-3.5rem)] md:max-w-[420px] md:flex-col md:justify-center md:border-l md:border-t-0 md:scroll-mt-0 md:px-7 md:py-6 md:shadow-[-6px_0_40px_rgba(0,0,0,0.14)] xl:max-w-[480px] xl:px-9 xl:py-8 2xl:max-w-[520px] 2xl:px-10"
          id="form"
        >
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-[1] hidden h-1 bg-teal md:block" aria-hidden />
          <div className="relative max-h-[min(100vh,900px)] overflow-y-auto md:max-h-full md:py-3">
            <FormVendedor />
          </div>
        </aside>
      </div>
      <MobileLeadBar variant="vendedor" />
    </>
  );
}

function StatCard({ stat, label, body }: { stat: ReactNode; label: string; body: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition-colors hover:border-teal/40 hover:bg-white/[0.07]">
      <div className="mb-3 h-[3px] w-7 rounded-sm bg-teal" />
      <div className="mb-1 font-serif text-4xl tracking-tight text-white">{stat}</div>
      <div className="mb-3 text-xs font-medium text-teal-2">{label}</div>
      <div className="mb-3 h-px bg-white/10" />
      <p className="text-sm leading-relaxed text-gray-2 [&_strong]:font-medium">{body}</p>
    </div>
  );
}
