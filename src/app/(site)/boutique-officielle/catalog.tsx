"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { LingotCard } from "@/components/products";
import { useGold } from "@/components/gold";
import { dec, n0 } from "@/lib/format";
import { PURITIES, priceOf } from "@/lib/pricing";
import type { ProductWithShop } from "@/lib/types";

const WEIGHTS = [1, 2, 5, 10, 20, 50, 100];
const FORMS = ["Rectangulaire", "Coulé", "Médaille ronde"];
const ST_LABEL = { in: "En stock", low: "Stock limité", out: "Rupture" } as const;

export function ShopCatalog({ products }: { products: ProductWithShop[] }) {
  const { quote } = useGold();
  const [weights, setWeights] = useState<number[]>([]);
  const [purity, setPurity] = useState<string[]>([]);
  const [forms, setForms] = useState<string[]>([]);
  const [maxPct, setMaxPct] = useState(100);
  const [stock, setStock] = useState(false);
  const [sort, setSort] = useState("pop");
  const [cmp, setCmp] = useState<string[]>([]);
  const [cmpOpen, setCmpOpen] = useState(false);
  const [sheet, setSheet] = useState(false);

  const rows = useMemo(
    () => products.map((p) => ({ p, pr: priceOf(p, quote.p24), g: Number(p.weight_g) })),
    [products, quote.p24],
  );
  const purities = useMemo(() => [...new Set(products.map((p) => p.purity ?? ""))].filter(Boolean), [products]);
  const MINP = 80000;
  const MAXP = Math.max(MINP * 2, Math.ceil(Math.max(0, ...rows.map((r) => r.pr.total)) / 100000) * 100000);
  const maxVal = MINP + ((MAXP - MINP) * maxPct) / 100;

  const tog = <T,>(arr: T[], set: (v: T[]) => void, v: T) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  let list = rows.filter(
    ({ p, pr, g }) =>
      (!weights.length || weights.includes(g)) &&
      (!purity.length || purity.includes(p.purity ?? "")) &&
      (!forms.length || forms.includes(p.form ?? "")) &&
      (maxPct >= 100 || pr.total <= maxVal) &&
      (!stock || p.stock_status !== "out"),
  );
  const sorters: Record<string, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
    pop: (a, b) => Number(b.p.badge === "top") - Number(a.p.badge === "top") || b.p.sales_count - a.p.sales_count || a.g - b.g,
    pa: (a, b) => a.pr.total - b.pr.total,
    pd: (a, b) => b.pr.total - a.pr.total,
    wa: (a, b) => a.g - b.g,
  };
  list = [...list].sort(sorters[sort]);

  const chips = [
    ...weights.map((v) => ({ label: v + " g", remove: () => tog(weights, setWeights, v) })),
    ...purity.map((v) => ({ label: v, remove: () => tog(purity, setPurity, v) })),
    ...forms.map((v) => ({ label: v, remove: () => tog(forms, setForms, v) })),
    ...(maxPct < 100 ? [{ label: "≤ " + n0(maxVal) + " FCFA", remove: () => setMaxPct(100) }] : []),
    ...(stock ? [{ label: "En stock", remove: () => setStock(false) }] : []),
  ];
  const reset = () => {
    setWeights([]);
    setPurity([]);
    setForms([]);
    setMaxPct(100);
    setStock(false);
  };
  const togCmp = (id: string) => setCmp((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));
  const cmpList = cmp.map((id) => rows.find((r) => r.p.id === id)!).filter(Boolean);
  const box = (on: boolean) => ({ border: on ? "1.5px solid #1A1814" : "1.5px solid #CFC7B6", background: on ? "#1A1814" : "#FFFFFF" });
  const pill = (on: boolean) => ({ border: on ? "1.5px solid #1A1814" : "1px solid #E6DFCF", background: on ? "#1A1814" : "#FFFFFF", color: on ? "#FAF7F0" : "#1A1814" });
  const title = (p: ProductWithShop) => (p.form === "Médaille ronde" ? "Médaille " : "Lingotin ") + n0(p.weight_g) + " g";

  const filters = (
    <aside
      onClick={(e) => e.stopPropagation()}
      className="flex max-h-[86vh] w-full flex-col gap-[26px] overflow-auto rounded-t-[20px] border border-line bg-white p-6 lg:sticky lg:top-6 lg:max-h-none lg:overflow-visible lg:rounded-xl"
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">Filtres</span>
        <button onClick={reset} className="min-h-11 border-0 bg-transparent text-[13px] font-semibold text-gold-dark">
          Réinitialiser
        </button>
      </div>
      <div>
        <div className="mb-3 text-xs uppercase tracking-[.12em] text-muted">Poids</div>
        <div className="flex flex-wrap gap-2">
          {WEIGHTS.map((v) => (
            <button key={v} onClick={() => tog(weights, setWeights, v)} className="h-11 min-w-14 rounded-lg px-3 text-[13px] font-semibold tnum" style={pill(weights.includes(v))}>
              {v} g
            </button>
          ))}
        </div>
      </div>
      <CheckGroup
        title="Pureté"
        items={purities.map((v) => ({ key: v, label: v + " · " + (PURITIES[v]?.ct ?? ""), n: rows.filter((r) => r.p.purity === v).length, on: purity.includes(v), toggle: () => tog(purity, setPurity, v) }))}
        box={box}
      />
      <CheckGroup
        title="Forme"
        items={FORMS.map((v) => ({ key: v, label: v, n: rows.filter((r) => r.p.form === v).length, on: forms.includes(v), toggle: () => tog(forms, setForms, v) }))}
        box={box}
      />
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-[.12em] text-muted">Prix maximum</span>
          <span className="text-[13px] font-semibold tnum">{maxPct >= 100 ? "Sans limite" : n0(maxVal) + " FCFA"}</span>
        </div>
        <input type="range" min={0} max={100} step={1} value={maxPct} onChange={(e) => setMaxPct(+e.target.value)} aria-label="Prix maximum" className="h-7 w-full" />
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>{n0(MINP)}</span>
          <span>{dec(MAXP / 1e6, 1)} M FCFA</span>
        </div>
      </div>
      <button onClick={() => setStock(!stock)} className="flex min-h-11 items-center gap-3 border-0 bg-transparent p-0 text-sm font-medium text-text">
        <span className="relative h-6 w-10 flex-none rounded-xl" style={{ background: stock ? "#1E6B4A" : "#CFC7B6" }}>
          <span className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all" style={{ left: stock ? 19 : 3 }} />
        </span>
        En stock uniquement
      </button>
      <button onClick={() => setSheet(false)} className="h-[52px] rounded-lg border-0 bg-text text-[15px] font-semibold text-ivory lg:hidden">
        Voir {list.length} lingotins
      </button>
    </aside>
  );

  return (
    <>
      <main className="wrap grid items-start gap-[clamp(20px,3vw,40px)] pb-24 pt-[clamp(20px,3vw,36px)] lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hidden lg:block">{filters}</div>
        {sheet && (
          <div onClick={() => setSheet(false)} className="fixed inset-0 z-[55] flex items-end bg-ink/55 lg:hidden">
            {filters}
          </div>
        )}

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button onClick={() => setSheet(true)} className="flex h-11 items-center gap-2 rounded-lg border border-text bg-white px-4 text-sm font-semibold text-text lg:hidden">
              <Icon name="filter" size={16} stroke={1.75} />
              Filtres{chips.length ? ` (${chips.length})` : ""}
            </button>
            <span className="text-sm text-muted">
              <b className="text-text tnum">{list.length}</b> lingotins
            </span>
            <label className="ml-auto flex items-center gap-2 text-[13px] text-muted">
              Trier
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 cursor-pointer rounded-lg border border-line bg-white px-3 text-sm font-medium text-text">
                <option value="pop">Les plus vendus</option>
                <option value="pa">Prix croissant</option>
                <option value="pd">Prix décroissant</option>
                <option value="wa">Poids croissant</option>
              </select>
            </label>
          </div>

          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {chips.map((c) => (
                <button key={c.label} onClick={c.remove} className="flex h-[34px] items-center gap-2 rounded-full border-0 bg-text px-3 text-[13px] font-medium text-ivory">
                  {c.label}
                  <span className="text-gold-light">×</span>
                </button>
              ))}
            </div>
          )}

          {list.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] gap-[clamp(12px,1.6vw,20px)] lg:grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))]">
              {list.map(({ p }) => (
                <LingotCard key={p.id} p={p} showForm compare={cmp.includes(p.id)} onCompare={() => togCmp(p.id)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sand text-gold-dark">
                <Icon name="search" size={28} />
              </div>
              <h3 className="mt-2 font-serif text-[28px] font-semibold">Aucun lingotin ne correspond</h3>
              <p className="m-0 max-w-[420px] text-sm leading-relaxed text-muted">
                Augmentez le prix maximum ou retirez un filtre. Un conseiller peut aussi vous aider à choisir le bon poids pour votre budget.
              </p>
              <button onClick={reset} className="mt-2 h-11 rounded-lg border border-gold-dark bg-transparent px-[18px] text-sm font-semibold text-gold-dark">
                Réinitialiser les filtres
              </button>
            </div>
          )}

          <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-5 rounded-xl bg-sand p-[clamp(20px,3vw,32px)]">
            <div className="font-serif text-2xl font-semibold">Comment est calculé le prix ?</div>
            <div className="text-sm leading-relaxed text-body">
              <b className="text-text">Or</b> · cours en direct × poids × pureté
            </div>
            <div className="text-sm leading-relaxed text-body">
              <b className="text-text">Façon</b> · frappe, numérotation, écrin scellé
            </div>
            <div className="text-sm leading-relaxed text-body">
              <b className="text-text">Livraison</b> · ajoutée au checkout selon votre ville
            </div>
          </div>
        </div>
      </main>

      {cmp.length > 0 && (
        <div className="fixed bottom-20 left-1/2 z-40 flex w-[min(720px,calc(100vw-24px))] -translate-x-1/2 items-center gap-3 rounded-xl border border-gold-light/35 bg-ink py-3 pl-[18px] pr-3 text-ivory shadow-[0_20px_48px_-16px_rgba(0,0,0,.5)] lg:bottom-6">
          <span className="flex-none text-[13px] text-stone">Comparer</span>
          <div className="flex min-w-0 flex-1 gap-2 overflow-auto">
            {cmpList.map(({ p }) => (
              <span key={p.id} className="flex h-9 flex-none items-center gap-2 whitespace-nowrap rounded-lg bg-ink-2 px-2.5 text-[13px] font-semibold">
                {n0(p.weight_g)} g · {PURITIES[p.purity ?? ""]?.ct}
                <button onClick={() => togCmp(p.id)} aria-label="Retirer" className="border-0 bg-transparent px-0.5 text-base text-gold-light">
                  ×
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={() => cmp.length >= 2 && setCmpOpen(true)}
            disabled={cmp.length < 2}
            className="h-11 flex-none rounded-lg border-0 px-[18px] text-[13px] font-semibold text-ink"
            style={{ background: cmp.length < 2 ? "#8A857C" : "#B8923A" }}
          >
            Comparer ({cmp.length}/3)
          </button>
        </div>
      )}

      {cmpOpen && (
        <div onClick={() => setCmpOpen(false)} className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4">
          <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-[880px] overflow-auto rounded-[20px] bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,.5)]">
            <div className="flex items-center justify-between px-6 pb-2 pt-6">
              <h3 className="m-0 font-serif text-[30px] font-semibold">Comparateur</h3>
              <button onClick={() => setCmpOpen(false)} aria-label="Fermer" className="flex h-11 w-11 items-center justify-center rounded-lg border-0 bg-ivory">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="overflow-x-auto px-6 pb-6 pt-2">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <tbody>
                  {(
                    [
                      ["Produit", (r: (typeof rows)[number]) => title(r.p)],
                      ["Pureté", (r) => `${r.p.purity} · ${PURITIES[r.p.purity ?? ""]?.ct} ${r.p.purity_verified ? "✓ vérifiée" : "déclarée"}`],
                      ["Forme", (r) => r.p.form ?? "—"],
                      ["Valeur de l'or", (r) => n0(r.pr.gold) + " FCFA"],
                      ["Façon", (r) => n0(r.pr.fabrication) + " FCFA"],
                      ["Prix total", (r) => n0(r.pr.total) + " FCFA"],
                      ["Prix / gramme", (r) => n0(r.pr.total / r.g) + " FCFA"],
                      ["Disponibilité", (r) => ST_LABEL[r.p.stock_status]],
                    ] as [string, (r: (typeof rows)[number]) => string][]
                  ).map(([label, f]) => (
                    <tr key={label} className="border-t border-sand">
                      <th className="w-[150px] py-3.5 pr-3 text-left font-medium text-muted">{label}</th>
                      {cmpList.map((r) => (
                        <td key={r.p.id} className="px-3 py-3.5 font-semibold tnum">
                          {f(r)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CheckGroup({
  title,
  items,
  box,
}: {
  title: string;
  items: { key: string; label: string; n: number; on: boolean; toggle: () => void }[];
  box: (on: boolean) => React.CSSProperties;
}) {
  return (
    <div>
      <div className="mb-3 text-xs uppercase tracking-[.12em] text-muted">{title}</div>
      <div className="flex flex-col gap-1">
        {items.map((o) => (
          <button key={o.key} onClick={o.toggle} className="flex min-h-11 items-center gap-3 border-0 bg-transparent p-0 text-left text-sm text-text">
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-[5px]" style={box(o.on)}>
              <Icon name="check" size={13} stroke={3} className="text-ivory" />
            </span>
            <span className="flex-1">{o.label}</span>
            <span className="text-xs text-muted">{o.n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
