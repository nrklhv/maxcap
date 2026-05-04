"use client";

import { Header } from "./Header";
import { Footer } from "./Footer";
import { Logo } from "./Logo";
import { FormBroker } from "./FormBroker";
import { PilarCard } from "./PilarCard";
import { StepRow, StepsWrap } from "./StepRow";
import { FaqList } from "./FaqItem";
import { brokerFaqItems } from "@/lib/faqBroker";

export function BrokerLanding() {
  return (
    <>
      <Header variant="broker" />
      <div className="md:mr-[420px] xl:mr-[480px] 2xl:mr-[520px]">
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
                3%
              </div>
              <span className="text-xs font-medium tracking-wide text-orange-2">
                Programa Brokers MaxRent
              </span>
            </div>
            <h1 className="mb-3 max-w-5xl font-serif text-4xl leading-[1.06] tracking-tight text-white md:text-5xl xl:text-6xl 2xl:text-6xl">
              Vende el Club a tus inversionistas.
              <br />
              <em className="block font-serif text-[1.12em] not-italic text-orange md:text-[1.08em]">
                Comisión del 3%.
              </em>
            </h1>
            <p className="max-w-3xl text-balance font-serif text-base font-normal leading-snug tracking-tight text-gray-2 md:text-lg md:leading-snug xl:text-xl">
              Te damos la plataforma para invitar y hacer seguimiento de tus clientes inversionistas.
              Nosotros nos encargamos de la <strong className="font-medium text-orange-2">evaluación</strong>,
              el <strong className="font-medium text-orange-2">crédito hipotecario</strong> y la{" "}
              <strong className="font-medium text-orange-2">administración</strong>. Tú te quedas con la relación y
              el 3% de cada venta.
            </p>
          </div>
        </section>

        <section className="bg-white px-4 py-12 md:px-10 md:py-16" id="programa">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-orange">
            Por qué vender el Club
          </div>
          <h2 className="mb-2 font-serif text-3xl tracking-tight text-dark md:text-[clamp(24px,2.2vw+14px,52px)]">
            4 razones para sumarte
            <br />
            al programa.
          </h2>
          <p className="mb-10 max-w-xl text-sm leading-relaxed text-gray-3">
            Diseñado para corredores y asesores que quieren ofrecer un producto de inversión inmobiliaria
            con respaldo institucional y comisión transparente.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PilarCard
              variant="orange"
              bgNum="01"
              numLabel="Razón 01"
              title="3% por cada venta cerrada"
              statValue="3%"
              statLabel={
                <>
                  comisión
                  <br />
                  por venta
                </>
              }
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <circle cx="10" cy="10" r="7" stroke="#7A6E68" strokeWidth="1.5" />
                  <path
                    d="M7 13l6-6 M8 8h.01 M12 12h.01"
                    stroke="#7A6E68"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              }
            >
              Comisión transparente sobre el valor de la compraventa de cada inversionista que cerraste.
              Se paga dentro de los 30 días hábiles posteriores a la firma de la escritura.
            </PilarCard>
            <PilarCard
              variant="orange"
              bgNum="02"
              numLabel="Razón 02"
              title="Tu portal de gestión"
              statValue="1 link"
              statLabel={
                <>
                  invita y trackea
                  <br />
                  cada inversionista
                </>
              }
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <rect x="3" y="4" width="14" height="12" rx="1.5" stroke="#7A6E68" strokeWidth="1.5" />
                  <path
                    d="M6 8h8 M6 11h5 M6 14h7"
                    stroke="#7A6E68"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              }
            >
              Generas un link único para invitar a tus inversionistas y ves el estado de cada uno (registrado,
              evaluado, aprobado, reservado, firmado) en un dashboard. Cero spreadsheet, cero seguimiento manual.
            </PilarCard>
            <PilarCard
              variant="orange"
              bgNum="03"
              numLabel="Razón 03"
              title="Nosotros operamos, tú vendes"
              statValue="0 ops"
              statLabel={
                <>
                  evaluación, crédito y
                  <br />
                  administración: nuestras
                </>
              }
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M10 2L3 5.5V10.5c0 3.5 3 6.5 7 7 4-.5 7-3.5 7-7V5.5L10 2z"
                    stroke="#7A6E68"
                    strokeWidth="1.5"
                  />
                  <path d="M7 10l2 2 4-4" stroke="#7A6E68" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
            >
              Te enfocas en la relación con el cliente. Nosotros nos encargamos de la evaluación crediticia,
              la asesoría en el crédito hipotecario, la firma de compraventa y la administración de la
              propiedad por Houm dentro del pool del Club.
            </PilarCard>
            <PilarCard
              variant="orange"
              bgNum="04"
              numLabel="Razón 04"
              title="Marca MaxRent by Houm"
              statValue="20.000+"
              statLabel={
                <>
                  propiedades
                  <br />
                  administradas por Houm
                </>
              }
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M3 17V8L10 3l7 5v9"
                    stroke="#7A6E68"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M8 17v-5h4v5" stroke="#7A6E68" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
            >
              Vendes un producto respaldado por la red de +20.000 propiedades de Houm en Chile, Colombia y
              México. MaxRent es una iniciativa de Houm con Renta Capital — el respaldo institucional es parte
              de tu pitch.
            </PilarCard>
          </div>
        </section>

        <section className="bg-cream px-4 py-16 md:px-10 md:py-20" id="como">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-orange">
            Cómo funciona
          </div>
          <h2 className="mb-2 font-serif text-3xl tracking-tight text-dark md:text-[clamp(24px,2.2vw+14px,52px)]">
            De la postulación
            <br />a tu primera comisión.
          </h2>
          <p className="mb-14 max-w-xl text-sm leading-relaxed text-gray-3">
            4 pasos simples — todo dentro del portal broker que ya construimos.
          </p>
          <StepsWrap>
            <StepRow
              step={1}
              tag="Paso 01"
              title="Te inscribes con tus datos comerciales"
              description="Completa este formulario y entras al portal broker donde finalizas tu perfil: empresa, experiencia, sitio web o LinkedIn, y un breve pitch."
            />
            <StepRow
              step={2}
              tag="Paso 02"
              title="Revisamos y aprobamos tu postulación"
              description="Nuestro equipo revisa cada postulación entre 2 y 5 días hábiles. Te notificamos por email apenas haya decisión."
            />
            <StepRow
              step={3}
              tag="Paso 03"
              title="Invitas inversionistas con tu link único"
              description="Una vez aprobado, generas links de invitación atados a tu cuenta. Cada inversionista que se registre con tu link queda asignado a ti, y haces seguimiento del estado en tiempo real."
            />
            <StepRow
              step={4}
              tag="Paso 04 · Tu comisión"
              title="Cuando tu invitado firma, ganas el 3%"
              description="Acompañamos a tu inversionista en evaluación, crédito y firma. Cuando se firma la compraventa, te pagamos el 3% sobre el valor de la propiedad dentro de los 30 días hábiles."
              isLast
            />
          </StepsWrap>
        </section>

        <section className="bg-cream px-4 py-16 md:px-10 md:py-20" id="faq">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-orange">
            Preguntas frecuentes
          </div>
          <h2 className="mb-2 font-serif text-3xl tracking-tight text-dark md:text-[clamp(24px,2.2vw+14px,52px)]">
            Lo que necesitas saber.
          </h2>
          <p className="mb-10 max-w-xl text-sm leading-relaxed text-gray-3">
            Si tienes alguna duda adicional, escríbenos al postular y te respondemos en menos de 24 horas.
          </p>
          <FaqList items={brokerFaqItems} accent="orange" />
        </section>

        <aside
          className="relative z-10 w-full scroll-mt-20 border-t border-gray-1 bg-white px-5 py-6 md:fixed md:right-0 md:top-14 md:flex md:h-[calc(100vh-3.5rem)] md:max-w-[420px] md:flex-col md:justify-center md:border-l md:border-t-0 md:scroll-mt-0 md:px-7 md:py-6 md:shadow-[-6px_0_40px_rgba(0,0,0,0.14)] xl:max-w-[480px] xl:px-9 xl:py-8 2xl:max-w-[520px] 2xl:px-10"
          id="form"
        >
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 z-[1] hidden h-1 bg-orange md:block"
            aria-hidden
          />
          <div className="relative max-h-[min(100vh,900px)] overflow-y-auto md:max-h-full md:py-3">
            <FormBroker />
          </div>
        </aside>
      </div>

      <Footer variant="inversionista" />
    </>
  );
}
