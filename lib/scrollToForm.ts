/**
 * Scroll suave al form lateral + focus al primer input + pulso visual.
 * Útil cuando el CTA del header apunta a `#form` y el form ya está visible
 * (caso desktop con form sticky): sin esto el click no produce feedback.
 *
 * Llamar desde un handler de click client-side.
 */
export function scrollToForm(): void {
  if (typeof window === "undefined") return;
  const aside = document.getElementById("form");
  if (!aside) return;

  // En mobile lleva el form al viewport; en desktop con sticky no se mueve
  // pero el highlight + focus dan feedback claro.
  aside.scrollIntoView({ behavior: "smooth", block: "start" });

  // Reinicia la animación si ya estaba aplicada (force reflow).
  aside.classList.remove("form-pulse");
  void aside.offsetWidth;
  aside.classList.add("form-pulse");

  // Focus al primer input/select visible — espera al fin del scroll suave.
  window.setTimeout(() => {
    const firstField = aside.querySelector<HTMLInputElement | HTMLSelectElement>(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled])'
    );
    firstField?.focus({ preventScroll: true });
  }, 350);
}
