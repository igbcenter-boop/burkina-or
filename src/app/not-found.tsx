import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink px-6 text-center text-ivory">
      <div className="font-serif text-[120px] font-semibold leading-none">
        4<span className="gold-text">0</span>4
      </div>
      <h1 className="m-0 font-serif text-4xl font-semibold">Page introuvable</h1>
      <p className="m-0 max-w-[420px] text-stone">Cette page n&apos;existe pas ou n&apos;est plus disponible.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-gold">Retour à l&apos;accueil</Link>
        <Link href="/boutique-officielle" className="flex h-12 items-center rounded-lg border border-gold-light/55 px-5 text-sm font-semibold text-ivory hover:text-ivory">Boutique officielle</Link>
      </div>
    </main>
  );
}
