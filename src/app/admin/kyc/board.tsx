"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { toast } from "@/components/toast";
import { ADMIN_TONE, SHOP_TYPES, type Tone } from "@/lib/labels";
import { since } from "@/lib/format";
import { decideShop, setDocStatus } from "@/lib/actions/admin";
import type { ShopType } from "@/lib/types";

type Doc = { id: string; label: string; issuer: string | null; file_path: string | null; doc_number: string | null; issued_at: string | null; expires_at: string | null; status: "pending" | "ok" | "ko"; note: string | null; url: string | null; pdf: boolean };
export type KycDossier = { id: string; mono: string; name: string; type: ShopType; city: string; resp: string; contact: string; rccm: string; ifu: string; zones: string; submittedAt: string; status: string; docs: Doc[] };

const P = (t: Tone) => ADMIN_TONE[t];
const MOTIFS = ["Documents falsifiés ou altérés", "Autorisation de commercialisation absente ou expirée", "Incohérence d'identité du responsable", "Activité non éligible sur la plateforme"];
const FILTERS: [string, string][] = [["tous", "Tous"], ["comptoir", "Comptoirs"], ["bijoutier", "Bijoutiers"], ["fondeur", "Fondeurs"], ["livreur", "Livreurs"]];

function sla(d: KycDossier): [string, Tone] {
  if (d.status === "more_info") return ["Compléments demandés", "mute"];
  const h = (Date.now() - new Date(d.submittedAt).getTime()) / 3600000;
  return h > 48 ? ["Hors délai", "err"] : h > 12 ? ["À traiter", "warn"] : ["Nouveau", "info"];
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export function KycBoard({ dossiers, validatedThisMonth }: { dossiers: KycDossier[]; validatedThisMonth: number }) {
  const router = useRouter();
  const [filter, setFilter] = useState("tous");
  const [selId, setSelId] = useState<string | null>(dossiers[0]?.id ?? null);
  const [docIdx, setDocIdx] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [rot, setRot] = useState(0);
  const [modal, setModal] = useState<null | "valid" | "compl" | "refus" | "susp">(null);
  const [motif, setMotif] = useState(0);
  const [compl, setCompl] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const shown = dossiers.filter((d) => filter === "tous" || d.type === filter);
  const sel = dossiers.find((d) => d.id === selId) ?? shown[0] ?? null;

  const late = dossiers.filter((d) => sla(d)[1] === "err").length;
  const doc = sel?.docs[Math.min(docIdx, (sel?.docs.length ?? 1) - 1)];
  const okN = sel?.docs.filter((d) => d.status === "ok").length ?? 0;
  const allOk = !!sel && okN === sel.docs.length && sel.docs.length > 0;

  const [now] = useState(() => Date.now());
  const fields = (() => {
    if (!doc || !sel) return [] as [string, string, string, Tone][];
    const isId = /identité/i.test(doc.label);
    const isRap = /rapport/i.test(doc.label);
    const exp = doc.expires_at ? new Date(doc.expires_at) : null;
    const issued = doc.issued_at ? new Date(doc.issued_at) : null;
    const out: [string, string, string, Tone][] = [
      ["Titulaire", isId ? sel.resp.toUpperCase() : sel.name, "À comparer au document", "info"],
      ["Numéro", doc.doc_number ?? "—", doc.doc_number ? "Renseigné" : "Manquant", doc.doc_number ? "ok" : "warn"],
      ["Émetteur", doc.issuer ?? "—", "Attendu", "ok"],
    ];
    if (isRap) out.push(["Date du rapport", fmt(doc.issued_at), issued && now - issued.getTime() > 183 * 86400000 ? "Plus de 6 mois" : issued ? "Récent" : "Non renseignée", issued && now - issued.getTime() > 183 * 86400000 ? "warn" : issued ? "ok" : "warn"]);
    else out.push(["Date de délivrance", fmt(doc.issued_at), issued ? "OK" : "Non renseignée", issued ? "ok" : "mute"]);
    if (exp) out.push(["Expiration", fmt(doc.expires_at), exp.getTime() < now ? "Expiré" : exp.getTime() - now < 30 * 86400000 ? "Expire sous 30 j" : "Valide", exp.getTime() < now ? "err" : exp.getTime() - now < 30 * 86400000 ? "warn" : "ok"]);
    out.push(["Fichier", doc.file_path ? (doc.pdf ? "PDF transmis" : "Image transmise") : "Non transmis", doc.file_path ? "Reçu" : "En attente", doc.file_path ? "ok" : "warn"]);
    return out;
  })();

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return toast(r.error ?? "Action impossible");
      toast(success);
      setModal(null);
      router.refresh();
    });

  const MODALS = {
    valid: ["Validation KYC", `Valider le compte de ${sel?.name} ?`, "Confirmer la validation", "#1E6B4A", "#FFFFFF"],
    compl: ["Validation KYC", "Demander des compléments", "Envoyer la demande", "#B8923A", "#0E0E10"],
    refus: ["Validation KYC", "Refuser le dossier", "Refuser définitivement", "#A8322D", "#FFFFFF"],
    susp: ["Validation KYC", `Suspendre ${sel?.name} ?`, "Suspendre le compte", "#A8322D", "#FFFFFF"],
  } as const;

  const confirm = () => {
    if (!sel || !modal) return;
    if (modal === "valid") act(() => decideShop(sel.id, "validate"), `${sel.name} est maintenant vérifié`);
    if (modal === "compl") act(() => decideShop(sel.id, "info", { docIds: Object.keys(compl).filter((k) => compl[k]), message: msg }), `Demande envoyée à ${sel.resp}`);
    if (modal === "refus") act(() => decideShop(sel.id, "refuse", { motif: MOTIFS[motif] }), "Dossier refusé");
    if (modal === "susp") act(() => decideShop(sel.id, "suspend"), `${sel.name} suspendu`);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        <span className={`inline-flex h-8 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-semibold ${P("warn")}`}>{dossiers.length} dossiers en attente</span>
        <span className={`inline-flex h-8 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-semibold ${P("err")}`}>{late} hors délai (&gt; 48 h)</span>
        <span className={`inline-flex h-8 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-semibold ${P("ok")}`}>{validatedThisMonth} validés ce mois</span>
      </div>
      <div className="grid items-start gap-5 wide:grid-cols-[320px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-xl border border-a-line bg-a-card">
          <div className="flex gap-1 overflow-x-auto border-b border-a-line2 p-2.5">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`h-[34px] flex-none whitespace-nowrap rounded-full border px-3 text-xs font-medium ${filter === id ? "border-a-text bg-a-text text-a-bg" : "border-a-line bg-a-card text-a-text"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {!shown.length && (
            <div className="flex flex-col items-center gap-2.5 px-6 py-12 text-center">
              <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-full ${P("ok")}`}>
                <Icon name="check" size={22} stroke={2} />
              </span>
              <div className="text-[15px] font-semibold">File vide</div>
              <div className="text-[13px] text-a-muted">Tous les dossiers de cette catégorie sont traités.</div>
            </div>
          )}
          {shown.map((d) => {
            const [label, tone] = sla(d);
            const on = sel?.id === d.id;
            return (
              <button
                key={d.id}
                onClick={() => {
                  setSelId(d.id);
                  setDocIdx(0);
                  setZoom(100);
                  setRot(0);
                }}
                className="grid w-full grid-cols-[40px_minmax(0,1fr)] gap-3 border-0 border-b border-l-[3px] border-b-a-line2 px-4 py-3.5 text-left text-a-text"
                style={{ borderLeftColor: on ? "#B8923A" : "transparent", background: on ? "var(--a-sel)" : "transparent" }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-a-soft font-serif text-base font-bold text-a-gold">{d.mono}</span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{d.name}</span>
                    <span className="flex-none text-[11px] text-a-muted">{since(d.submittedAt)}</span>
                  </span>
                  <span className="text-xs text-a-muted">
                    {SHOP_TYPES[d.type]} · {d.city}
                  </span>
                  <span className={`inline-flex h-[22px] items-center self-start whitespace-nowrap rounded-full px-2 text-[11px] font-semibold ${P(tone)}`}>{label}</span>
                </span>
              </button>
            );
          })}
        </section>

        {sel && doc && (
          <div className="flex min-w-0 flex-col gap-5">
            <section className="flex flex-col gap-[18px] rounded-xl border border-a-line bg-a-card p-[22px]">
              <div className="flex flex-wrap items-start gap-4">
                <span className="flex h-[60px] w-[60px] flex-none items-center justify-center rounded-xl bg-ink font-serif text-2xl font-bold text-gold-light">{sel.mono}</span>
                <div className="min-w-[220px] flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="m-0 font-serif text-[28px] font-semibold leading-[1.1]">{sel.name}</h2>
                    <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-[9px] text-xs font-semibold ${P(sla(sel)[1])}`}>{sla(sel)[0]}</span>
                  </div>
                  <div className="mt-1 text-[13px] text-a-muted">
                    {SHOP_TYPES[sel.type]} · {sel.city} · dossier soumis {since(sel.submittedAt)} · {sel.contact}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5 text-[13px]">
                {[
                  ["Responsable", sel.resp],
                  ["RCCM", sel.rccm],
                  ["IFU", sel.ifu],
                  ["Zones déclarées", sel.zones],
                  ["Pièces conformes", `${okN} / ${sel.docs.length}`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-a-muted">{k}</div>
                    <div className={`mt-0.5 font-semibold ${k === "RCCM" ? "font-mono text-xs" : ""}`}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="h-1.5 overflow-hidden rounded-[3px] bg-a-soft">
                <div className="h-full bg-ok" style={{ width: `${sel.docs.length ? (okN / sel.docs.length) * 100 : 0}%` }} />
              </div>
            </section>

            <div className="grid items-start gap-5 [@media(min-width:1400px)]:grid-cols-[300px_minmax(0,1fr)]">
              <section className="overflow-hidden rounded-xl border border-a-line bg-a-card">
                <div className="border-b border-a-line2 px-[18px] py-4 text-sm font-semibold">Pièces justificatives</div>
                {sel.docs.map((d, i) => {
                  const m: [string, Tone] = d.status === "ok" ? ["Conforme", "ok"] : d.status === "ko" ? ["Non conforme", "err"] : d.file_path ? ["À vérifier", "warn"] : ["Non transmise", "mute"];
                  const on = i === docIdx;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        setDocIdx(i);
                        setZoom(100);
                        setRot(0);
                      }}
                      className="grid w-full grid-cols-[20px_minmax(0,1fr)] gap-3 border-0 border-b border-a-line2 px-[18px] py-3.5 text-left text-a-text"
                      style={{ background: on ? "var(--a-sel)" : "transparent", boxShadow: on ? "inset 3px 0 0 #B8923A" : "none" }}
                    >
                      <Icon name="file" size={18} className="mt-0.5" style={{ color: `var(--p-${m[1]})` }} />
                      <span className="flex min-w-0 flex-col gap-[5px]">
                        <span className="text-[13px] font-semibold leading-snug">{d.label}</span>
                        <span className="text-xs leading-snug text-a-muted">{d.issuer}</span>
                        <span className={`inline-flex h-[22px] items-center self-start whitespace-nowrap rounded-full px-2 text-[11px] font-semibold ${P(m[1])}`}>{m[0]}</span>
                      </span>
                    </button>
                  );
                })}
              </section>

              <section className="min-w-0 overflow-hidden rounded-xl border border-a-line bg-a-card">
                <div className="flex flex-wrap items-center gap-2 border-b border-a-line2 py-2.5 pl-[18px] pr-3">
                  <span className="min-w-[160px] flex-1 text-sm font-semibold">{doc.label}</span>
                  <button onClick={() => setZoom(Math.max(60, zoom - 20))} aria-label="Dézoomer" className="h-9 w-9 rounded-lg border border-a-line bg-transparent text-base text-a-text">
                    −
                  </button>
                  <span className="w-12 text-center text-xs text-a-muted tnum">{zoom} %</span>
                  <button onClick={() => setZoom(Math.min(200, zoom + 20))} aria-label="Zoomer" className="h-9 w-9 rounded-lg border border-a-line bg-transparent text-base text-a-text">
                    +
                  </button>
                  <button onClick={() => setRot((rot + 90) % 360)} aria-label="Pivoter" className="flex h-9 w-9 items-center justify-center rounded-lg border border-a-line bg-transparent text-a-text">
                    <Icon name="rotate" size={16} stroke={1.75} />
                  </button>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="flex h-9 items-center rounded-lg border border-a-line px-3 text-xs font-semibold text-a-text">
                      Ouvrir
                    </a>
                  )}
                </div>
                <div className="flex h-[360px] items-center justify-center overflow-hidden bg-ink">
                  <div style={{ transform: `scale(${zoom / 100}) rotate(${rot}deg)`, transition: "transform .25s ease" }}>
                    {doc.url && !doc.pdf ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={doc.url} alt={doc.label} className="max-h-[330px] max-w-[460px] rounded shadow-[0_20px_40px_-12px_rgba(0,0,0,.6)]" />
                    ) : doc.url && doc.pdf ? (
                      <iframe src={doc.url} title={doc.label} className="h-[330px] w-[460px] max-w-full rounded bg-white" />
                    ) : (
                      <div className="flex h-[310px] w-[230px] flex-col gap-2.5 rounded bg-ivory p-5 text-text shadow-[0_20px_40px_-12px_rgba(0,0,0,.6)]" style={{ background: "#FAF7F0 repeating-linear-gradient(0deg,rgba(140,106,31,.06) 0 1px,transparent 1px 14px)" }}>
                        <div className="h-2.5 w-3/5 rounded-sm bg-line" />
                        <div className="h-1.5 w-[85%] rounded-sm bg-sand" />
                        <div className="h-1.5 w-3/4 rounded-sm bg-sand" />
                        <div className="mt-auto font-mono text-[9px] leading-normal text-muted">
                          {doc.file_path ? "aperçu indisponible" : "pièce non transmise"} · {doc.label}
                          <br />
                          {doc.doc_number}
                        </div>
                        <div className="h-[54px] w-[54px] self-end rounded-full border-[1.5px] border-info/45" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 px-[18px] py-4">
                  <div className="text-xs uppercase tracking-[.12em] text-a-muted">Données déclarées &amp; contrôles</div>
                  {fields.map(([k, v, note, tone]) => (
                    <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] items-center gap-3 border-b border-a-line2 py-1.5 text-[13px]">
                      <span className="text-a-muted">{k}</span>
                      <span className="font-medium tnum">{v}</span>
                      <span className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2 text-[11px] font-semibold ${P(tone)}`}>{note}</span>
                    </div>
                  ))}
                  <div className="mt-1.5 flex flex-wrap justify-end gap-2.5">
                    <button disabled={pending} onClick={() => act(() => setDocStatus(doc.id, "ko", "Pièce non conforme"), "Pièce marquée non conforme")} className="h-11 rounded-lg border border-err bg-transparent px-4 text-[13px] font-semibold text-a-err">
                      Non conforme
                    </button>
                    <button
                      disabled={pending}
                      onClick={() =>
                        act(async () => {
                          const r = await setDocStatus(doc.id, "ok");
                          if (r.ok) setDocIdx(Math.min(sel.docs.length - 1, docIdx + 1));
                          return r;
                        }, "Pièce marquée conforme")
                      }
                      className="flex h-11 items-center gap-2 rounded-lg border-0 bg-ok px-4 text-[13px] font-semibold text-white"
                    >
                      <Icon name="check" size={15} stroke={2.25} />
                      Marquer conforme
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <div className="sticky bottom-4 z-[5] flex flex-wrap items-center gap-3 rounded-xl border border-a-line bg-a-card px-[18px] py-3.5 shadow-[0_16px_40px_-20px_rgba(14,14,16,.45)]">
              <span className="min-w-[220px] flex-1 text-[13px] leading-snug text-a-muted">
                {allOk ? "Toutes les pièces sont conformes. Vous pouvez valider le compte." : `${sel.docs.length - okN} pièce(s) restent à contrôler avant de pouvoir valider ce compte.`}
              </span>
              <button onClick={() => setModal("susp")} className="h-11 border-0 bg-transparent px-3.5 text-[13px] font-semibold text-a-muted">
                Suspendre
              </button>
              <button onClick={() => setModal("refus")} className="h-11 rounded-lg border border-err bg-transparent px-4 text-[13px] font-semibold text-a-err">
                Refuser
              </button>
              <button
                onClick={() => {
                  setCompl(Object.fromEntries(sel.docs.map((d) => [d.id, d.status !== "ok"])));
                  setMsg(`Bonjour ${sel.resp.split(" ")[0]},\nAfin de finaliser la vérification de ${sel.name}, merci de nous transmettre les pièces indiquées. Le rapport d'analyse doit dater de moins de 6 mois.`);
                  setModal("compl");
                }}
                className="h-11 rounded-lg border border-a-gold bg-transparent px-4 text-[13px] font-semibold text-a-gold"
              >
                Demander des compléments
              </button>
              <button
                onClick={() => allOk && setModal("valid")}
                disabled={!allOk}
                className="flex h-11 items-center gap-2 rounded-lg border-0 px-[18px] text-[13px] font-semibold"
                style={{ background: allOk ? "#1E6B4A" : "var(--a-soft)", color: allOk ? "#FFFFFF" : "var(--a-muted)", cursor: allOk ? "pointer" : "not-allowed" }}
              >
                <Icon name="shield-check" size={15} stroke={2} />
                Valider le compte
              </button>
            </div>
          </div>
        )}
      </div>

      {modal && sel && (
        <div onClick={() => setModal(null)} className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-5">
          <div onClick={(e) => e.stopPropagation()} className="max-h-[calc(100vh-40px)] w-full max-w-[520px] overflow-auto rounded-[20px] bg-a-card text-a-text shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)]">
            <div className="px-[26px] pb-1.5 pt-[26px]">
              <div className="text-[11px] uppercase tracking-[.14em] text-a-gold">{MODALS[modal][0]}</div>
              <h3 className="m-0 mt-1.5 font-serif text-[28px] font-semibold leading-[1.15]">{MODALS[modal][1]}</h3>
            </div>
            <div className="flex flex-col gap-3.5 px-[26px] pb-1 pt-3.5 text-sm leading-relaxed">
              {modal === "valid" && (
                <>
                  <p className="m-0 text-a-muted">Le compte sera activé immédiatement et pourra publier des offres.</p>
                  {["Attribution du badge « Vendeur vérifié »", sel.type === "comptoir" ? "Accès à l'espace Grossistes & comptoirs et aux demandes de devis" : sel.type === "livreur" ? "Réception des missions de livraison" : "Publication des produits et réception des commandes", "Rappel automatique 30 jours avant l'expiration des autorisations"].map((t) => (
                    <span key={t} className="flex gap-2.5">
                      <Icon name="check" size={18} stroke={2} className="mt-0.5 flex-none text-ok" />
                      {t}
                    </span>
                  ))}
                </>
              )}
              {modal === "compl" && (
                <>
                  <div className="font-semibold">Pièces à fournir à nouveau</div>
                  {sel.docs.map((d) => (
                    <button key={d.id} onClick={() => setCompl({ ...compl, [d.id]: !compl[d.id] })} className="flex min-h-11 items-start gap-3 border-0 bg-transparent py-1 text-left text-sm text-a-text">
                      <span className="mt-px flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[5px] text-[13px] text-white" style={{ border: compl[d.id] ? "0" : "1.5px solid var(--a-muted)", background: compl[d.id] ? "#1E6B4A" : "transparent" }}>
                        {compl[d.id] ? "✓" : ""}
                      </span>
                      <span>{d.label}</span>
                    </button>
                  ))}
                  <label className="flex flex-col gap-2">
                    <span className="font-semibold">Message au demandeur</span>
                    <textarea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} className="resize-y rounded-lg border border-a-line bg-a-input p-3 text-sm text-a-text outline-none" />
                  </label>
                </>
              )}
              {modal === "refus" && (
                <>
                  <div className="font-semibold">Motif du refus</div>
                  {MOTIFS.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => setMotif(i)}
                      className="flex min-h-11 items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-left text-sm text-a-text"
                      style={{ border: motif === i ? "1.5px solid #A8322D" : "1px solid var(--a-line)", background: motif === i ? "var(--p-err-bg)" : "transparent" }}
                    >
                      <span className="h-[18px] w-[18px] flex-none rounded-full bg-white" style={{ border: motif === i ? "5px solid #A8322D" : "1.5px solid var(--a-muted)" }} />
                      {m}
                    </button>
                  ))}
                  <p className="m-0 text-[13px] text-a-muted">Le demandeur pourra soumettre un nouveau dossier dans 30 jours.</p>
                </>
              )}
              {modal === "susp" && <p className="m-0 text-a-muted">Le dossier est gelé : aucune publication ni transaction possible jusqu&apos;à la levée de la suspension. Le demandeur est informé.</p>}
            </div>
            <div className="flex gap-2.5 px-[26px] pb-[26px] pt-5">
              <button onClick={() => setModal(null)} className="h-12 flex-1 rounded-lg border border-a-line bg-transparent text-sm font-semibold text-a-text">
                Annuler
              </button>
              <button disabled={pending} onClick={confirm} className="h-12 flex-[1.3] rounded-lg border-0 text-sm font-semibold" style={{ background: MODALS[modal][3], color: MODALS[modal][4] }}>
                {pending ? "…" : MODALS[modal][2]}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
