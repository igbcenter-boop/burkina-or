import { Icon } from "../icons";
import { Logo } from "../ui";

const LABELS = ["Panier", "Livraison", "Paiement", "Confirmation"];

/** En-tête sobre du tunnel de commande, avec la frise d'étapes. */
export function CheckoutHeader({ step, tracking = false }: { step: number; tracking?: boolean }) {
  return (
    <>
      <header className="border-b border-gold-light/[.22] bg-ink text-ivory">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-6 px-[clamp(16px,3vw,40px)]">
          <Logo size={28} />
          {tracking ? (
            <span className="mx-auto text-[13px] uppercase tracking-[.14em] text-gold-light">Suivi de commande</span>
          ) : (
            <ol className="mx-auto hidden min-w-0 list-none items-center gap-2 p-0 lg:flex wide:gap-3">
              {LABELS.map((label, i) => {
                const done = i < step, cur = i === step;
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span className="flex items-center gap-2.5">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                        style={{
                          background: done ? "#1E6B4A" : cur ? "#B8923A" : "transparent",
                          color: cur ? "#0E0E10" : "#FAF7F0",
                          border: i > step ? "1px solid rgba(255,255,255,.25)" : "0",
                        }}
                      >
                        {done ? <Icon name="check" size={14} stroke={2.5} /> : i + 1}
                      </span>
                      <span className="whitespace-nowrap text-[13px] font-medium" style={{ color: i <= step ? "#FAF7F0" : "#8A857C" }}>
                        {label}
                      </span>
                    </span>
                    {i < 3 && <span className="h-px w-4 wide:w-9" style={{ background: done ? "#1E6B4A" : "rgba(255,255,255,.18)" }} />}
                  </li>
                );
              })}
            </ol>
          )}
          <span className="ml-auto flex flex-none items-center gap-2 whitespace-nowrap text-[13px] text-stone">
            <Icon name="lock" size={16} className="text-gold-light" />
            <span className="wide:hidden">Sécurisé</span>
            <span className="hidden wide:inline">Paiement 100 % sécurisé</span>
          </span>
        </div>
      </header>
      {!tracking && (
        <div className="border-b border-line bg-white px-4 py-3 lg:hidden">
          <div className="flex justify-between text-[13px]">
            <span className="font-semibold">{LABELS[step]}</span>
            <span className="text-muted">Étape {step + 1} sur 4</span>
          </div>
          <div className="mt-2.5 h-[3px] overflow-hidden rounded-sm bg-sand">
            <div className="h-full bg-gold" style={{ width: `${((step + 1) / 4) * 100}%` }} />
          </div>
        </div>
      )}
    </>
  );
}
