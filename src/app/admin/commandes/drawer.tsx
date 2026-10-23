"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { toast } from "@/components/toast";
import { ADMIN_TONE, ORDER_STATUS } from "@/lib/labels";
import { refundOrder, setOrderStatus } from "@/lib/actions/admin";
import type { OrderStatus } from "@/lib/types";

export type DrawerOrder = {
  id: string;
  number: string;
  date: string;
  space: string;
  client: string;
  clientContact: string;
  shop: string;
  shopContact: string;
  pay: string;
  ref: string;
  status: OrderStatus;
  items: string[];
  lines: [string, string, boolean][];
  payout: string;
  blocked: boolean;
  shipments: string[];
  canRefund: boolean;
};

const STATUSES: OrderStatus[] = ["pending_payment", "paid", "confirmed", "preparing", "collected", "shipped", "at_hub", "delivered", "incident", "cancelled"];

export function OrderDrawer({ o, closeHref }: { o: DrawerOrder; closeHref: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [modal, setModal] = useState<null | "refund" | "contact">(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<OrderStatus>(o.status);
  const [note, setNote] = useState("");
  const close = () => router.replace(closeHref, { scroll: false });
  const [label, tone] = ORDER_STATUS[o.status];

  return (
    <div onClick={close} className="fixed inset-0 z-50 bg-ink/50">
      <aside onClick={(e) => e.stopPropagation()} className="absolute bottom-0 right-0 top-0 flex w-[min(460px,100vw)] flex-col overflow-auto bg-a-card text-a-text shadow-[-24px_0_60px_-24px_rgba(0,0,0,.5)]">
        <div className="flex items-start justify-between gap-3 border-b border-a-line px-6 py-[22px]">
          <div>
            <div className="text-xs text-a-muted">
              {o.date} · {o.space}
            </div>
            <div className="mt-0.5 font-serif text-[28px] font-semibold">{o.number.replace(/^(BO-)(\d{3})/, "$1$2 ")}</div>
            <span className={`mt-2 inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${ADMIN_TONE[tone]}`}>{label}</span>
          </div>
          <button onClick={close} aria-label="Fermer" className="flex h-11 w-11 items-center justify-center rounded-lg border-0 bg-a-soft text-a-text">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 border-b border-a-line2 px-6 py-5 text-[13px]">
          {[
            ["Client", o.client],
            ["Vendeur", o.shop],
            ["Paiement", o.pay],
            ["Réf. transaction", o.ref],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-a-muted">{k}</div>
              <div className={`mt-0.5 ${k === "Réf. transaction" ? "font-mono text-xs" : "font-semibold"}`}>{v}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2.5 px-6 py-5 text-sm tnum">
          <div className="mb-1 text-xs uppercase tracking-[.12em] text-a-muted">Ventilation financière</div>
          {o.lines.map(([k, v, strong], i) => (
            <div key={k} className="flex justify-between gap-3" style={{ padding: i === 3 ? "10px 0 0" : 0, borderTop: i === 3 ? "1px solid var(--a-line)" : "none" }}>
              <span style={{ color: strong ? "var(--a-text)" : "var(--a-muted)", fontWeight: strong ? 600 : 400 }}>{k}</span>
              <span style={{ fontWeight: strong ? 600 : 400 }}>{v}</span>
            </div>
          ))}
          <div className={`mt-2 rounded-[10px] px-3.5 py-3 text-[13px] font-medium ${o.blocked ? ADMIN_TONE.err : ADMIN_TONE.ok}`}>{o.payout}</div>
        </div>
        <div className="flex flex-col gap-2 border-t border-a-line2 px-6 py-5 text-[13px]">
          <div className="text-xs uppercase tracking-[.12em] text-a-muted">Articles & expéditions</div>
          {o.items.map((i) => (
            <div key={i}>{i}</div>
          ))}
          {o.shipments.map((s) => (
            <div key={s} className="text-a-muted">
              {s}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2.5 border-t border-a-line2 px-6 py-5">
          <div className="text-xs uppercase tracking-[.12em] text-a-muted">Mettre à jour le statut</div>
          <div className="flex gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className="h-11 flex-1 rounded-lg border border-a-line bg-a-input px-2 text-sm text-a-text">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS[s][0]}
                </option>
              ))}
            </select>
            <button
              disabled={pending || status === o.status}
              onClick={() =>
                start(async () => {
                  const r = await setOrderStatus(o.id, status, note);
                  if (!r.ok) return toast(r.error ?? "Erreur");
                  toast("Statut mis à jour");
                  router.refresh();
                })
              }
              className="h-11 rounded-lg border-0 bg-gold px-4 text-[13px] font-semibold text-ink disabled:opacity-50"
            >
              Appliquer
            </button>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note visible par le client (facultatif)" className="h-10 rounded-lg border border-a-line bg-a-input px-3 text-[13px] text-a-text outline-none" />
        </div>
        <div className="mt-auto flex flex-wrap gap-2.5 border-t border-a-line px-6 py-[18px]">
          <button onClick={() => setModal("contact")} className="h-[46px] flex-[1_1_140px] rounded-lg border border-a-line bg-transparent text-[13px] font-semibold text-a-text">
            Contacter les parties
          </button>
          {o.canRefund && (
            <button onClick={() => setModal("refund")} className="h-[46px] flex-[1_1_140px] rounded-lg border border-err bg-transparent text-[13px] font-semibold text-a-err">
              Initier un remboursement
            </button>
          )}
        </div>
      </aside>

      {modal && (
        <div onClick={(e) => (e.stopPropagation(), setModal(null))} className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-5">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[520px] rounded-[20px] bg-a-card p-[26px] text-a-text shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)]">
            {modal === "contact" ? (
              <>
                <div className="text-[11px] uppercase tracking-[.14em] text-a-gold">Coordonnées</div>
                <h3 className="m-0 mt-1.5 font-serif text-[28px] font-semibold">Contacter les parties</h3>
                <div className="mt-4 flex flex-col gap-3 text-sm">
                  <div>
                    <div className="text-a-muted">Client · {o.client}</div>
                    <div className="font-semibold">{o.clientContact || "—"}</div>
                  </div>
                  <div>
                    <div className="text-a-muted">Vendeur · {o.shop}</div>
                    <div className="font-semibold">{o.shopContact || "—"}</div>
                  </div>
                </div>
                <button onClick={() => setModal(null)} className="mt-5 h-12 w-full rounded-lg border border-a-line bg-transparent text-sm font-semibold text-a-text">
                  Fermer
                </button>
              </>
            ) : (
              <>
                <div className="text-[11px] uppercase tracking-[.14em] text-a-gold">Opération sensible</div>
                <h3 className="m-0 mt-1.5 font-serif text-[28px] font-semibold leading-tight">Initier le remboursement de {o.number}</h3>
                <p className="mt-3 text-sm text-a-muted">Confirmez avec votre mot de passe. Cette action sera inscrite au journal d&apos;audit.</p>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" autoComplete="current-password" className="mt-2 h-12 w-full rounded-lg border border-a-line bg-a-input px-3 text-a-text outline-none" />
                <div className="mt-5 flex gap-2.5">
                  <button onClick={() => setModal(null)} className="h-12 flex-1 rounded-lg border border-a-line bg-transparent text-sm font-semibold text-a-text">
                    Annuler
                  </button>
                  <button
                    disabled={pending || !password}
                    onClick={() =>
                      start(async () => {
                        const r = await refundOrder(o.id, password);
                        if (!r.ok) return toast(r.error ?? "Erreur");
                        toast("Remboursement initié · validation Finance enregistrée");
                        setModal(null);
                        router.refresh();
                      })
                    }
                    className="h-12 flex-[1.3] rounded-lg border-0 bg-err text-sm font-semibold text-white"
                  >
                    Confirmer le remboursement
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
