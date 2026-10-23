"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { Icon, StarIcon } from "@/components/icons";
import { ContactSeller } from "@/components/contact-seller";
import { toast } from "@/components/toast";
import { fcfa } from "@/lib/format";
import { MOBILE_MONEY, PAYMENT_METHODS } from "@/lib/labels";
import { cancelOrder, leaveReview } from "@/lib/actions/account";
import { checkPayment, payByCard, startMobilePayment } from "@/lib/actions/checkout";
import type { FormState } from "@/lib/actions/public";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/types";

type O = { id: string; number: string; status: OrderStatus; payment_status: PaymentStatus; payment_method: PaymentMethod; total: number; mm_phone: string | null };

export function OrderActions({ order, delivered, reviewed, sellers }: { order: O; delivered: boolean; reviewed: boolean; sellers: { id: string; name: string; slug: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const cancellable = ["pending_payment", "paid", "confirmed"].includes(order.status);
  const unpaid = order.status === "pending_payment" && order.payment_status !== "paid";

  return (
    <div className="flex flex-col gap-4">
      {unpaid && (MOBILE_MONEY.includes(order.payment_method) || order.payment_method === "card") && <PayNow order={order} />}
      {delivered && !reviewed && <ReviewForm orderId={order.id} />}
      <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-white p-5">
        <Link href={`/facture/${order.number}`} target="_blank" className="flex min-h-11 items-center justify-between border-b border-sand text-sm font-medium text-text hover:text-text">
          Télécharger la facture
          <span className="text-gold-dark">›</span>
        </Link>
        {sellers.map((s) => (
          <div key={s.id} className="border-b border-sand py-1.5 [&_button]:h-10 [&_button]:w-full [&_button]:justify-between [&_button]:border-0 [&_button]:px-0 [&_button]:text-sm [&_button]:font-medium [&_button]:text-text">
            <ContactSeller shopId={s.id} shopName={s.name} back={`/compte/commandes/${order.number}`} label={`Contacter ${sellers.length > 1 ? s.name : "le vendeur"}`} subject={`Commande ${order.number}`} />
          </div>
        ))}
        <Link href={`/compte/reclamations/nouvelle?commande=${order.id}`} className="flex min-h-11 items-center justify-between text-sm font-medium text-err hover:text-err">
          Signaler un problème
          <span>›</span>
        </Link>
        {cancellable && (
          <button
            disabled={busy}
            onClick={async () => {
              if (!confirm("Annuler cette commande ? Si elle est payée, le remboursement sera initié.")) return;
              setBusy(true);
              const r = await cancelOrder(order.id);
              setBusy(false);
              if (!r.ok) return toast(r.error ?? "Annulation impossible");
              toast("Commande annulée");
              router.refresh();
            }}
            className="mt-1 h-11 rounded-lg border border-err/40 bg-transparent text-sm font-semibold text-err"
          >
            {busy ? "Annulation…" : "Annuler la commande (rétractation)"}
          </button>
        )}
      </div>
    </div>
  );
}

function PayNow({ order }: { order: O }) {
  const router = useRouter();
  const P = PAYMENT_METHODS[order.payment_method];
  const [phone, setPhone] = useState((order.mm_phone ?? "").replace(/^226/, ""));
  const [card, setCard] = useState({ number: "", exp: "", cvc: "" });
  const [state, setState] = useState<"idle" | "wait" | "ok">("idle");
  const tx = useRef<string | null>(null);

  useEffect(() => {
    if (state !== "wait") return;
    const t = setInterval(async () => {
      const r = await checkPayment(tx.current!);
      if (r.status === "paid") {
        clearInterval(t);
        setState("ok");
        toast("Paiement reçu");
        router.refresh();
      } else if (r.status === "failed") {
        clearInterval(t);
        setState("idle");
        toast("La demande a expiré, renvoyez-la");
      }
    }, 2000);
    return () => clearInterval(t);
  }, [state, router]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border-[1.5px] border-gold bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold" style={{ background: P[2], color: P[3] }}>
          {P[1]}
        </span>
        <div>
          <div className="text-sm font-semibold">Régler {fcfa(order.total)}</div>
          <div className="text-xs text-muted">{P[0]}</div>
        </div>
      </div>
      {state === "wait" ? (
        <div className="flex items-center gap-2.5 text-sm text-muted">
          <span className="h-4 w-4 animate-bo-spin rounded-full border-2 border-line border-t-gold" />
          Validez sur votre téléphone ({P[5]})…
        </div>
      ) : order.payment_method === "card" ? (
        <>
          <input className="field" placeholder="Numéro de carte" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="field" placeholder="MM / AA" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} />
            <input className="field" placeholder="CVC" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} />
          </div>
          <button
            onClick={async () => {
              const r = await payByCard(order.id, card);
              if (!r.ok) return toast(r.error ?? "Paiement refusé");
              toast("Paiement accepté");
              router.refresh();
            }}
            className="btn-gold"
          >
            Payer
          </button>
        </>
      ) : (
        <>
          <div className="flex h-12 overflow-hidden rounded-lg border border-line">
            <span className="flex items-center border-r border-line bg-ivory px-3.5 text-[15px] text-body">+226</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="min-w-0 flex-1 border-0 px-3.5 text-[15px] outline-none tnum" />
          </div>
          <button
            onClick={async () => {
              const r = await startMobilePayment(order.id, "226" + phone.replace(/\D/g, ""));
              if (!r.ok) return toast(r.error ?? "Échec");
              if (!r.txId) return router.refresh();
              tx.current = r.txId;
              setState("wait");
            }}
            className="btn-gold"
          >
            Envoyer la demande de paiement
          </button>
        </>
      )}
    </div>
  );
}

function ReviewForm({ orderId }: { orderId: string }) {
  const [rating, setRating] = useState(5);
  const [state, action, pending] = useActionState<FormState, FormData>(leaveReview, null);
  if (state?.ok) return <div className="rounded-xl bg-ok-bg p-5 text-sm font-semibold text-ok">{state.message}</div>;
  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-5">
      <div className="text-[15px] font-semibold">Laisser un avis</div>
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} étoiles`} className="border-0 bg-transparent p-0.5">
            <StarIcon size={22} color={n <= rating ? "#B8923A" : "#E6DFCF"} />
          </button>
        ))}
      </div>
      <textarea name="body" rows={3} className="field" placeholder="Qualité, emballage, livraison…" />
      {state?.error && <span className="text-sm text-err">{state.error}</span>}
      <button disabled={pending} className="btn-gold">
        <Icon name="send" size={16} />
        Publier
      </button>
    </form>
  );
}
