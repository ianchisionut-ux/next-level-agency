import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex items-center gap-2 justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-full-transparent.png" alt="Next Level Advertising Agency" className="h-14 w-auto object-contain" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-mist-100 mb-2">Pagina nu există</h1>
        <p className="text-sm text-mist-500 mb-6">
          Fie a fost ștearsă, fie nu ai acces la ea.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-xl bg-signal hover:bg-signal-bright transition-colors text-white text-sm font-medium px-4 py-2.5"
        >
          Înapoi la dashboard
        </Link>
      </div>
    </div>
  );
}
