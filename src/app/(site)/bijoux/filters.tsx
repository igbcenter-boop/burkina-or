"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { OCCASIONS } from "@/lib/labels";
import { n0 } from "@/lib/format";

type Current = { categorie: string; occasion: string; titre: string; collection: string; tri: string; max: string; q: string };

const MAXES = [0, 250000, 500000, 1000000, 2000000];

export function JewelFilters({ cats, current, count }: { cats: { slug: string; name: string; count: number }[]; current: Current; count: number }) {
  const router = useRouter();
  const path = usePathname();
  const [sheet, setSheet] = useState(false);
  const set = (patch: Partial<Current>) => {
    const next = { ...current, ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter(([k, v]) => v && !(k === "tri" && v === "pop")) as [string, string][]);
    router.replace(`${path}${qs.size ? "?" + qs : ""}`, { scroll: false });
  };
  const active = [current.categorie, current.occasion, current.titre, current.collection, current.max, current.q].filter(Boolean).length;
  const radio = (on: boolean) => ({ border: on ? "1.5px solid #1A1814" : "1.5px solid #CFC7B6", background: on ? "#1A1814" : "#FFFFFF" });

  const panel = (
    <aside onClick={(e) => e.stopPropagation()} className="flex max-h-[86vh] w-full flex-col gap-[26px] overflow-auto rounded-t-[20px] border border-line bg-white p-6 lg:sticky lg:top-6 lg:max-h-none lg:overflow-visible lg:rounded-xl">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">Filtres</span>
        <button onClick={() => router.replace(path, { scroll: false })} className="min-h-11 border-0 bg-transparent text-[13px] font-semibold text-gold-dark">
          Réinitialiser
        </button>
      </div>
      <div>
        <div className="mb-3 text-xs uppercase tracking-[.12em] text-muted">Trier</div>
        <select value={current.tri} onChange={(e) => set({ tri: e.target.value })} className="field h-11">
          <option value="pop">Les plus vendus</option>
          <option value="recent">Nouveautés</option>
          <option value="pa">Prix croissant</option>
          <option value="pd">Prix décroissant</option>
        </select>
      </div>
      <Group title="Catégorie">
        {cats.map((c) => (
          <Opt key={c.slug} on={current.categorie === c.slug} onClick={() => set({ categorie: current.categorie === c.slug ? "" : c.slug })} label={c.name} n={c.count} style={radio} />
        ))}
      </Group>
      <Group title="Occasion">
        {OCCASIONS.map((o) => (
          <Opt key={o} on={current.occasion === o} onClick={() => set({ occasion: current.occasion === o ? "" : o })} label={o} style={radio} />
        ))}
      </Group>
      <div>
        <div className="mb-3 text-xs uppercase tracking-[.12em] text-muted">Titre de l&apos;or</div>
        <div className="flex flex-wrap gap-2">
          {["24", "22", "18"].map((t) => {
            const on = current.titre === t;
            return (
              <button
                key={t}
                onClick={() => set({ titre: on ? "" : t })}
                className="h-11 min-w-16 rounded-lg px-3 text-[13px] font-semibold"
                style={{ border: on ? "1.5px solid #1A1814" : "1px solid #E6DFCF", background: on ? "#1A1814" : "#FFF", color: on ? "#FAF7F0" : "#1A1814" }}
              >
                {t} ct
              </button>
            );
          })}
        </div>
      </div>
      <Group title="Budget maximum">
        {MAXES.map((m) => (
          <Opt key={m} on={(current.max || "0") === String(m)} onClick={() => set({ max: m ? String(m) : "" })} label={m ? `Jusqu'à ${n0(m)} FCFA` : "Sans limite"} style={radio} />
        ))}
      </Group>
      <button onClick={() => setSheet(false)} className="h-[52px] rounded-lg border-0 bg-text text-[15px] font-semibold text-ivory lg:hidden">
        Voir {count} bijoux
      </button>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block">{panel}</div>
      <button onClick={() => setSheet(true)} className="flex h-11 items-center gap-2 self-start rounded-lg border border-text bg-white px-4 text-sm font-semibold text-text lg:hidden">
        <Icon name="filter" size={16} stroke={1.75} />
        Filtres{active ? ` (${active})` : ""}
      </button>
      {sheet && (
        <div onClick={() => setSheet(false)} className="fixed inset-0 z-[55] flex items-end bg-ink/55 lg:hidden">
          {panel}
        </div>
      )}
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-xs uppercase tracking-[.12em] text-muted">{title}</div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function Opt({ on, onClick, label, n, style }: { on: boolean; onClick: () => void; label: string; n?: number; style: (on: boolean) => React.CSSProperties }) {
  return (
    <button onClick={onClick} className="flex min-h-11 items-center gap-3 border-0 bg-transparent p-0 text-left text-sm text-text">
      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-[5px]" style={style(on)}>
        <Icon name="check" size={13} stroke={3} className="text-ivory" />
      </span>
      <span className="flex-1">{label}</span>
      {n != null && <span className="text-xs text-muted">{n}</span>}
    </button>
  );
}
