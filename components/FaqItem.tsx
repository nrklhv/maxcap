"use client";

import { useState } from "react";
import type { FaqEntry } from "@/lib/faqTypes";

export type { FaqEntry };

export function FaqList({
  items,
  accent = "orange",
}: {
  items: FaqEntry[];
  accent?: "orange" | "teal";
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const iconOpen = accent === "teal" ? "bg-teal text-white" : "bg-orange text-white";

  return (
    <div className="flex flex-col">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div
            key={item.id}
            className={`border-b border-gray-1 first:border-t ${open ? "open" : ""}`}
          >
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left"
              onClick={() => setOpenId(open ? null : item.id)}
              aria-expanded={open}
            >
              <span className="text-[15px] font-medium leading-snug text-dark">{item.question}</span>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-1 text-base text-gray-3 transition-transform duration-300 ${
                  open ? `${iconOpen} rotate-45` : ""
                }`}
              >
                +
              </span>
            </button>
            <div
              className={`overflow-hidden text-[13.5px] leading-relaxed text-gray-3 transition-[max-height,padding] duration-300 ease-out ${
                open ? "max-h-[320px] pb-5" : "max-h-0"
              }`}
            >
              <p>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
