"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { toast } from "@/components/toast";
import { createClient } from "@/lib/supabase/client";
import { recordKycDocument, submitKyc } from "@/lib/actions/pro";

type Doc = { id: string; label: string; issuer: string | null; status: "pending" | "ok" | "ko"; file_path: string | null; note: string | null; doc_number: string | null; expires_at: string | null };

const ST = { ok: ["Conforme", "bg-ok-bg text-ok"], ko: ["Non conforme", "bg-err-bg text-err"], pending: ["À vérifier", "bg-warn-bg text-warn"] } as const;

export function DocRow({ shopId, doc }: { shopId: string; doc: Doc }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [number, setNumber] = useState(doc.doc_number ?? "");
  const [expires, setExpires] = useState(doc.expires_at ?? "");
  const missing = !doc.file_path && doc.status !== "ok";
  const [label, cls] = missing ? (["À téléverser", "bg-mute-bg text-body"] as const) : ST[doc.status];

  const open = async () => {
    if (!doc.file_path) return;
    const { data } = await createClient().storage.from("kyc").createSignedUrl(doc.file_path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="grid gap-3 border-t border-sand px-5 py-4 first:border-0 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center">
      <div className="flex items-start gap-3">
        <Icon name={doc.status === "ok" ? "file-check" : "file"} size={20} className={doc.status === "ok" ? "mt-0.5 text-ok" : "mt-0.5 text-gold-dark"} />
        <div>
          <div className="text-sm font-semibold">{doc.label}</div>
          <div className="text-xs text-muted">{doc.issuer}</div>
          <span className={`mt-1.5 inline-flex h-[22px] items-center rounded-full px-2 text-[11px] font-semibold ${cls}`}>{label}</span>
          {doc.status === "ko" && doc.note && <div className="mt-1 text-xs text-err">Motif : {doc.note}</div>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="N° de la pièce" className="h-10 rounded-lg border border-line px-3 text-[13px] outline-none focus:border-gold" disabled={doc.status === "ok"} />
        <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} title="Date d'expiration" className="h-10 rounded-lg border border-line px-3 text-[13px] outline-none focus:border-gold" disabled={doc.status === "ok"} />
      </div>
      <div className="flex gap-2">
        {doc.file_path && (
          <button onClick={open} className="h-10 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-text">
            Voir
          </button>
        )}
        {doc.status !== "ok" && (
          <button onClick={() => input.current?.click()} disabled={busy} className="flex h-10 items-center gap-1.5 rounded-lg border-0 bg-gold px-3 text-xs font-semibold text-ink">
            <Icon name="upload" size={14} />
            {busy ? "Envoi…" : doc.file_path ? "Remplacer" : "Téléverser"}
          </button>
        )}
        <input
          ref={input}
          type="file"
          hidden
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 10 * 1024 * 1024) return toast("Fichier trop volumineux (10 Mo max)");
            setBusy(true);
            const ext = (f.name.split(".").pop() || "pdf").toLowerCase();
            const path = `${shopId}/${doc.id}-${Date.now()}.${ext}`;
            const { error } = await createClient().storage.from("kyc").upload(path, f, { contentType: f.type });
            if (error) {
              setBusy(false);
              return toast("Envoi impossible : " + error.message);
            }
            const r = await recordKycDocument({ docId: doc.id, shopId, path, number, expires });
            setBusy(false);
            if (!r.ok) return toast(r.error ?? "Erreur");
            toast("Pièce transmise");
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}

export function SubmitKyc({ shopId, ready }: { shopId: string; ready: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={!ready || pending}
      onClick={() =>
        start(async () => {
          await submitKyc(shopId);
          toast("Dossier transmis à l'équipe conformité");
        })
      }
      className="btn-dark disabled:opacity-50"
    >
      {pending ? "Envoi…" : "Soumettre mon dossier"}
    </button>
  );
}
