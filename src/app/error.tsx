"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="m-0 font-serif text-4xl font-semibold">Un incident est survenu</h1>
      <p className="m-0 max-w-[440px] text-muted">Nous n&apos;avons pas pu afficher cette page. Réessayez dans un instant.</p>
      <button onClick={reset} className="btn-gold">Réessayer</button>
    </main>
  );
}
