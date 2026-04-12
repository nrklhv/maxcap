import type { ReactNode } from "react";

export function PilarCard({
  variant,
  bgNum,
  numLabel,
  title,
  statValue,
  statLabel,
  tag,
  icon,
  children,
}: {
  variant: "orange" | "teal";
  bgNum: string;
  numLabel: string;
  title: string;
  statValue?: string;
  statLabel?: ReactNode;
  tag?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const isOrange = variant === "orange";
  const borderHover = isOrange
    ? "hover:border-orange group-hover:border-orange"
    : "hover:border-teal group-hover:border-teal";
  const topBar = isOrange ? "bg-orange" : "bg-teal";
  const numColor = isOrange ? "text-orange" : "text-teal";
  const iconBg = isOrange ? "bg-gray-1 group-hover:bg-orange-light" : "bg-teal-light";
  const bgNumHover = isOrange
    ? "group-hover:text-orange/10"
    : "group-hover:text-teal/10";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border-[1.5px] border-gray-1 bg-cream p-7 transition-transform duration-200 hover:-translate-y-0.5 ${borderHover}`}
    >
      <div
        className={`pointer-events-none absolute left-0 right-0 top-0 h-[3px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${topBar}`}
      />
      <div
        className={`pointer-events-none absolute bottom-[-10px] right-3.5 select-none font-serif text-[4.5rem] leading-none text-gray-1 transition-colors duration-200 ${bgNumHover}`}
      >
        {bgNum}
      </div>
      {icon && (
        <div
          className={`relative mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors duration-200 ${iconBg}`}
        >
          {icon}
        </div>
      )}
      <div className={`relative mb-1 text-xs font-semibold uppercase tracking-wider ${numColor}`}>
        {numLabel}
      </div>
      {tag && (
        <span
          className={`relative mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isOrange ? "bg-orange-light text-orange" : "bg-teal-light text-teal"
          }`}
        >
          {tag}
        </span>
      )}
      <h3 className="relative mb-2 text-base font-semibold leading-snug text-dark md:text-lg">{title}</h3>
      {statValue && (
        <div className="relative mb-2.5 inline-flex items-baseline gap-1">
          <span className={`font-serif text-3xl tracking-tight ${numColor}`}>{statValue}</span>
          <span className="max-w-[5rem] text-xs leading-tight text-gray-3">{statLabel}</span>
        </div>
      )}
      <p className="relative text-sm leading-relaxed text-gray-3">{children}</p>
    </div>
  );
}
