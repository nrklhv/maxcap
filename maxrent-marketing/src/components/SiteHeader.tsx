import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export async function SiteHeader() {
  const session = await auth();
  return (
    <header className="border-b border-gray-1 bg-cream/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-2xl text-dark">MaxRent</span>
          <span className="text-xs uppercase tracking-widest text-orange font-semibold">
            Recursos de marca
          </span>
        </Link>
        {session?.user?.email && (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
            className="flex items-center gap-3"
          >
            <span className="text-xs text-gray-3 hidden sm:inline">
              {session.user.email}
            </span>
            <button
              type="submit"
              className="text-xs font-medium text-dark border border-gray-2 rounded-full px-3 py-1.5 hover:bg-white transition"
            >
              Cerrar sesión
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
