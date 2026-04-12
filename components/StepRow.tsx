import type { ReactNode } from "react";

export function StepRow({
  step,
  tag,
  title,
  description,
  isLast,
}: {
  step: number;
  tag: string;
  title: string;
  description: ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="relative grid grid-cols-[56px_1fr] gap-6 pb-9 last:pb-0">
      <div
        className={`relative z-[1] flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-orange ${
          isLast ? "bg-orange" : "bg-white"
        }`}
      >
        <span
          className={`font-serif text-2xl tracking-tight ${isLast ? "text-white" : "text-orange"}`}
        >
          {step}
        </span>
      </div>
      <div className="pt-2.5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-orange">{tag}</div>
        <div className="mb-2 font-serif text-xl tracking-tight text-dark">{title}</div>
        <p className="max-w-[520px] text-sm leading-relaxed text-gray-3 [&_strong]:font-medium [&_strong]:text-dark">
          {description}
        </p>
      </div>
    </div>
  );
}

export function StepsWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col before:absolute before:bottom-14 before:left-[27px] before:top-14 before:w-0.5 before:bg-gradient-to-b before:from-orange before:to-orange/10">
      {children}
    </div>
  );
}
