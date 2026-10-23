"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { toast } from "@/components/toast";
import { ADMIN_TONE, PAYMENT_METHODS, type Tone } from "@/lib/labels";
import { dateTime, dec, n0 } from "@/lib/format";
import { addGoldPrice, saveSettings } from "@/lib/actions/admin";
import type { Commissions, PaymentMethod, PaymentsSettings, PricingSettings } from "@/lib/types";

const COM_LABELS: [keyof Commissions, string][] = [
  ["lingot", "Lingotins (Boutique officielle)"],
  ["bijou", "Bijoux"],
  ["sur_mesure", "Créations sur mesure"],
  ["gros", "Offres de gros"],
  ["service", "Fondeurs & services"],
  ["livraison", "Livraison"],
];

function Toggle({ on, onClick, label, disabled }: { on: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={label} aria-pressed={on} className="flex h-11 w-[52px] flex-none items-center justify-center border-0 bg-transparent">
      <span className="relative block h-[26px] w-11 rounded-[13px]" style={{ background: on ? "#1E6B4A" : "var(--a-toggle-off)" }}>
        <span className="absolute top-[3px] h-5 w-5 rounded-full bg-white transition-[left] duration-150" style={{ left: on ? 21 : 3 }} />
      </span>
    </button>
  );
}

export function SettingsForm({
  canEdit,
  pricing,
  commissions,
  payments,
  locales,
  raw,
  volumes,
  updatedAt,
}: {
  canEdit: boolean;
  pricing: PricingSettings;
  commissions: Commissions;
  payments: PaymentsSettings;
  locales: [string, string, string][];
  raw: number;
  volumes: Record<string, string>;
  updatedAt: string;
}) {
  const router = useRouter();
  const [pr, setPr] = useState(pricing);
  const [com, setCom] = useState<Record<string, string>>(Object.fromEntries(Object.entries(commissions).map(([k, v]) => [k, String(v).replace(".", ",")])));
  const [pays, setPays] = useState(payments);
  const [dirty, setDirty] = useState(false);
  const [modal, setModal] = useState(false);
  const [password, setPassword] = useState("");
  const [newRaw, setNewRaw] = useState("");
  const [pending, start] = useTransition();
  const mark = () => !dirty && setDirty(true);
  const publicPrice = raw * (1 + pr.margin_pct / 100);

  const reset = () => {
    setPr(pricing);
    setCom(Object.fromEntries(Object.entries(commissions).map(([k, v]) => [k, String(v).replace(".", ",")])));
    setPays(payments);
    setDirty(false);
  };

  const sel = "h-11 rounded-lg border border-a-line bg-a-input px-2.5 text-sm text-a-text";

  return (
    <>
      {!canEdit && <div className={`rounded-xl px-5 py-3 text-sm ${ADMIN_TONE.info}`}>Lecture seule : seuls les administrateurs peuvent modifier les paramètres.</div>}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] items-start gap-5">
        <section className="flex flex-col gap-[18px] rounded-xl border border-a-line bg-a-card p-[22px]">
          <div>
            <h2 className="m-0 text-base font-semibold">Cours de l&apos;or &amp; indexation</h2>
            <div className="mt-1 text-[13px] text-a-muted">Cotation en temps réel du lundi au vendredi · dernière mise à jour {dateTime(updatedAt)}</div>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">Source de cotation</span>
              <select disabled={!canEdit} value={pr.source} onChange={(e) => (setPr({ ...pr, source: e.target.value }), mark())} className={sel}>
                <option>LBMA Gold Price (USD/oz)</option>
                <option>COMEX GC continu</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">Conversion USD → FCFA</span>
              <select disabled={!canEdit} value={pr.fx} onChange={(e) => (setPr({ ...pr, fx: e.target.value }), mark())} className={sel}>
                <option>Taux BCEAO du jour</option>
                <option>Taux interbancaire temps réel</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">Marge Boutique officielle</span>
              <div className="flex h-11 items-center overflow-hidden rounded-lg border border-a-line bg-a-input">
                <button type="button" disabled={!canEdit} onClick={() => (setPr({ ...pr, margin_pct: Math.max(0, +(pr.margin_pct - 0.1).toFixed(1)) }), mark())} aria-label="Diminuer" className="h-[42px] w-11 border-0 bg-transparent text-base text-a-text">
                  −
                </button>
                <span className="flex-1 text-center font-semibold tnum">{dec(pr.margin_pct, 1)} %</span>
                <button type="button" disabled={!canEdit} onClick={() => (setPr({ ...pr, margin_pct: Math.min(10, +(pr.margin_pct + 0.1).toFixed(1)) }), mark())} aria-label="Augmenter" className="h-[42px] w-11 border-0 bg-transparent text-base text-a-text">
                  +
                </button>
              </div>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">Garantie de prix au panier</span>
              <select disabled={!canEdit} value={pr.lock_minutes} onChange={(e) => (setPr({ ...pr, lock_minutes: +e.target.value }), mark())} className={sel}>
                {[10, 15, 30].map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-[10px] bg-ink px-[18px] py-4 text-ivory tnum">
            <div>
              <div className="text-[11px] uppercase tracking-[.1em] text-[#A39E94]">Cours brut</div>
              <div className="mt-1 text-[17px] font-semibold">{n0(raw)}</div>
              <div className="text-[11px] text-[#A39E94]">FCFA/g</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[.1em] text-[#A39E94]">Marge</div>
              <div className="mt-1 text-[17px] font-semibold">{dec(pr.margin_pct, 1)} %</div>
              <div className="text-[11px] text-[#A39E94]">appliquée</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[.1em] text-gold-light">Prix public</div>
              <div className="mt-1 text-[17px] font-semibold text-gold-light">{n0(publicPrice)}</div>
              <div className="text-[11px] text-[#A39E94]">FCFA/g · 24 ct</div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm leading-normal">
              Suspendre les ventes si le cours varie de plus de <b>{pr.breaker_pct} %</b> en 1 h
            </span>
            <Toggle disabled={!canEdit} on={pr.breaker_enabled} onClick={() => (setPr({ ...pr, breaker_enabled: !pr.breaker_enabled }), mark())} label="Disjoncteur de cours" />
          </div>
          {canEdit && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = Number(newRaw.replace(/\s/g, "").replace(",", "."));
                start(async () => {
                  const r = await addGoldPrice(v);
                  if (!r.ok) return toast(r.error ?? "Erreur");
                  toast("Nouveau cours publié · catalogue réindexé");
                  setNewRaw("");
                  router.refresh();
                });
              }}
              className="flex flex-wrap items-end gap-2 border-t border-a-line2 pt-4"
            >
              <label className="flex min-w-[180px] flex-1 flex-col gap-2">
                <span className="text-[13px] font-medium">Publier un nouveau cours brut (FCFA/g, 24 ct)</span>
                <input value={newRaw} onChange={(e) => setNewRaw(e.target.value)} inputMode="decimal" placeholder={n0(raw)} className="h-11 rounded-lg border border-a-line bg-a-input px-3 text-sm text-a-text outline-none tnum" />
              </label>
              <button disabled={pending || !newRaw} className="h-11 rounded-lg border-0 bg-gold px-4 text-[13px] font-semibold text-ink disabled:opacity-50">
                Publier
              </button>
            </form>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-a-line bg-a-card">
          <div className="px-[22px] pb-3.5 pt-[22px]">
            <h2 className="m-0 text-base font-semibold">Commissions par catégorie</h2>
            <div className="mt-1 text-[13px] text-a-muted">Prélevées sur le prix vendeur, jamais ajoutées au prix client</div>
          </div>
          {COM_LABELS.map(([k, label]) => (
            <div key={k} className="flex items-center gap-3 border-t border-a-line2 px-[22px] py-2.5">
              <span className="flex-1 text-sm">{label}</span>
              <span className="text-xs text-a-muted">{volumes[k]}</span>
              <div className="flex h-10 w-[110px] items-center overflow-hidden rounded-lg border border-a-line bg-a-input">
                <input
                  disabled={!canEdit}
                  value={com[k] ?? ""}
                  onChange={(e) => (setCom({ ...com, [k]: e.target.value.replace(/[^\d,.]/g, "") }), mark())}
                  aria-label={label}
                  className="min-w-0 flex-1 border-0 bg-transparent px-1.5 text-right text-sm font-semibold text-a-text outline-none tnum"
                />
                <span className="pl-0.5 pr-2.5 text-[13px] text-a-muted">%</span>
              </div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-a-line bg-a-card">
          <div className="px-[22px] pb-3.5 pt-[22px]">
            <h2 className="m-0 text-base font-semibold">Moyens de paiement</h2>
          </div>
          {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((id) => {
            const on = pays[id]?.enabled !== false;
            return (
              <div key={id} className="flex items-center gap-3 border-t border-a-line2 py-1.5 pl-[22px] pr-3.5">
                <span className="flex-1 text-sm">{id === "card" ? "Carte Visa / Mastercard" : PAYMENT_METHODS[id][0]}</span>
                <span className="text-xs text-a-muted">{on ? pays[id]?.fee : "désactivé"}</span>
                <Toggle disabled={!canEdit} on={on} onClick={() => (setPays({ ...pays, [id]: { ...pays[id], enabled: !on } }), mark())} label={PAYMENT_METHODS[id][0]} />
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-xl border border-a-line bg-a-card">
          <div className="px-[22px] pb-3.5 pt-[22px]">
            <h2 className="m-0 text-base font-semibold">Langues &amp; devises</h2>
          </div>
          {locales.map(([label, state, k]) => (
            <div key={label} className="flex items-center gap-3 border-t border-a-line2 px-[22px] py-3.5">
              <span className="flex-1 text-sm">{label}</span>
              <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-[9px] text-xs font-semibold ${ADMIN_TONE[k as Tone]}`}>{state}</span>
            </div>
          ))}
        </section>
      </div>

      {dirty && (
        <div className="sticky bottom-4 z-[5] flex flex-wrap items-center gap-3 rounded-xl border border-gold-light/30 bg-ink px-[18px] py-3.5 text-ivory shadow-[0_16px_40px_-16px_rgba(14,14,16,.6)]">
          <Icon name="lock" size={18} className="text-gold-light" />
          <span className="min-w-[200px] flex-1 text-sm">Modifications non enregistrées · opération sensible, double validation requise</span>
          <button onClick={reset} className="h-11 border-0 bg-transparent px-3.5 text-[13px] font-semibold text-stone">
            Annuler
          </button>
          <button onClick={() => setModal(true)} className="h-11 rounded-lg border-0 bg-gold px-[18px] text-[13px] font-semibold text-ink">
            Enregistrer
          </button>
        </div>
      )}

      {modal && (
        <div onClick={() => setModal(false)} className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-5">
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const commissionsNum = Object.fromEntries(Object.entries(com).map(([k, v]) => [k, Number(String(v).replace(",", ".")) || 0]));
              start(async () => {
                const r = await saveSettings({ password, pricing: pr, commissions: commissionsNum, payments: pays });
                if (!r.ok) return toast(r.error ?? "Erreur");
                toast("Paramètres enregistrés");
                setModal(false);
                setDirty(false);
                setPassword("");
                router.refresh();
              });
            }}
            className="w-full max-w-[520px] rounded-[20px] bg-a-card p-[26px] text-a-text shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)]"
          >
            <div className="text-[11px] uppercase tracking-[.14em] text-a-gold">Opération sensible</div>
            <h3 className="m-0 mt-1.5 font-serif text-[28px] font-semibold">Confirmez avec votre mot de passe</h3>
            <p className="mt-3 text-sm text-a-muted">Les nouveaux paramètres s&apos;appliquent immédiatement aux prix publics. Cette action sera inscrite au journal d&apos;audit.</p>
            <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Mot de passe" className="mt-2 h-12 w-full rounded-lg border border-a-line bg-a-input px-3 text-a-text outline-none" />
            <div className="mt-5 flex gap-2.5">
              <button type="button" onClick={() => setModal(false)} className="h-12 flex-1 rounded-lg border border-a-line bg-transparent text-sm font-semibold text-a-text">
                Annuler
              </button>
              <button disabled={pending || !password} className="h-12 flex-[1.3] rounded-lg border-0 bg-gold text-sm font-semibold text-ink">
                {pending ? "…" : "Confirmer et enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
