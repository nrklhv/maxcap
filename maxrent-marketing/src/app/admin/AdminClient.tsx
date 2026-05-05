"use client";

import { useState, useTransition } from "react";
import { addEmailAction, removeEmailAction } from "./actions";

type AllowedRow = {
  id: string;
  email: string;
  addedBy: string | null;
  note: string | null;
  createdAtFormatted: string;
};

export function AdminClient({
  initialList,
  currentAdminEmail,
}: {
  initialList: AllowedRow[];
  currentAdminEmail: string;
}) {
  const [list, setList] = useState<AllowedRow[]>(initialList);
  const [emailInput, setEmailInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addEmailAction(form);
      if (result.ok) {
        const newRow: AllowedRow = {
          id: `tmp-${Date.now()}`,
          email: emailInput.trim().toLowerCase(),
          addedBy: currentAdminEmail,
          note: noteInput.trim() || null,
          createdAtFormatted: new Date().toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        };
        setList((prev) =>
          [...prev.filter((r) => r.email !== newRow.email), newRow].sort((a, b) =>
            a.email.localeCompare(b.email)
          )
        );
        setEmailInput("");
        setNoteInput("");
        setSuccess(`Acceso agregado: ${newRow.email}`);
      } else {
        setError(result.error);
      }
    });
  }

  function handleRemove(email: string) {
    if (
      !window.confirm(
        `¿Quitar acceso a ${email}? La persona dejará de poder entrar a marketing.maxrent.cl.`
      )
    )
      return;
    setError(null);
    setSuccess(null);
    const form = new FormData();
    form.set("email", email);
    startTransition(async () => {
      const result = await removeEmailAction(form);
      if (result.ok) {
        setList((prev) => prev.filter((r) => r.email !== email));
        setSuccess(`Acceso retirado: ${email}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section className="space-y-8">
      {/* Form */}
      <div className="bg-white border border-gray-1 rounded-2xl p-6">
        <h2 className="text-xl text-dark font-serif mb-4">Agregar acceso</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
            <input
              type="email"
              name="email"
              placeholder="correo@ejemplo.cl"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={isPending}
              required
              className="rounded-lg border border-gray-2 bg-cream px-4 py-3 text-sm text-dark placeholder:text-gray-3 focus:outline-none focus:border-orange disabled:opacity-50"
            />
            <input
              type="text"
              name="note"
              placeholder="Nota (opcional, ej. 'Rodrigo - diseño')"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              disabled={isPending}
              className="rounded-lg border border-gray-2 bg-cream px-4 py-3 text-sm text-dark placeholder:text-gray-3 focus:outline-none focus:border-orange disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isPending || !emailInput.trim()}
              className="rounded-lg bg-dark text-cream px-5 py-3 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "..." : "Agregar"}
            </button>
          </div>
          {error && (
            <div className="rounded-lg bg-orange-light border border-orange/30 p-3 text-sm text-dark">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-900">
              {success}
            </div>
          )}
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white border border-gray-1 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-1 flex items-center justify-between">
          <h2 className="text-xl text-dark font-serif">Lista de accesos</h2>
          <span className="text-xs font-medium text-gray-3 bg-cream px-3 py-1.5 rounded-full">
            {list.length} {list.length === 1 ? "correo" : "correos"}
          </span>
        </div>
        {list.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-3">
              Aún no hay correos en la lista. Agrega el primero arriba.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-1">
            {list.map((row) => (
              <li
                key={row.email}
                className="px-6 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-dark font-medium truncate">
                    {row.email}
                  </p>
                  <p className="text-xs text-gray-3 mt-0.5">
                    Agregado el {row.createdAtFormatted}
                    {row.addedBy && ` · por ${row.addedBy}`}
                    {row.note && ` · ${row.note}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(row.email)}
                  disabled={isPending}
                  className="text-sm font-medium text-orange hover:underline shrink-0 disabled:opacity-50"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
