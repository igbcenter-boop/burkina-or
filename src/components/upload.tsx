"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Icon } from "./icons";
import { createClient } from "@/lib/supabase/client";

const ext = (f: File) => (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Téléverse un fichier dans `bucket/folder/…` et renvoie son chemin (et son URL publique). */
export async function uploadFile(bucket: string, folder: string, file: File) {
  const supabase = createClient();
  const path = `${folder}/${crypto.randomUUID()}.${ext(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

/** Galerie d'images (produits) : ajout multiple, suppression, ordre conservé. */
export function ImagesField({ name, folder, initial = [], max = 8 }: { name: string; folder: string; initial?: string[]; max?: number }) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      {urls.map((u) => (
        <input key={u} type="hidden" name={name} value={u} />
      ))}
      <div className="flex flex-wrap gap-2.5">
        {urls.map((u, i) => (
          <div key={u} className="relative h-24 w-24 overflow-hidden rounded-lg border border-line">
            <Image src={u} alt="" fill sizes="96px" className="object-cover" />
            {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-ink/80 px-1.5 text-[10px] text-ivory">Principale</span>}
            <button type="button" onClick={() => setUrls(urls.filter((x) => x !== u))} aria-label="Retirer" className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border-0 bg-white/90 text-err">
              <Icon name="x" size={12} stroke={2.5} />
            </button>
          </div>
        ))}
        {urls.length < max && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gold bg-ivory text-xs font-semibold text-gold-dark">
            {busy ? <span className="h-5 w-5 animate-bo-spin rounded-full border-2 border-line border-t-gold" /> : <Icon name="upload" size={20} />}
            {busy ? "Envoi…" : "Ajouter"}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []).slice(0, max - urls.length);
          if (!files.length) return;
          setBusy(true);
          setErr(null);
          try {
            const out: string[] = [];
            for (const f of files) {
              if (f.size > 10 * 1024 * 1024) throw new Error(`${f.name} dépasse 10 Mo`);
              out.push((await uploadFile("products", folder, f)).url);
            }
            setUrls((u) => [...u, ...out]);
          } catch (ex) {
            setErr((ex as Error).message);
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      <span className="text-xs text-muted">JPEG, PNG ou WebP, 10 Mo max. Fond neutre conseillé ; la première photo est la photo principale.</span>
      {err && <span className="text-xs text-err">{err}</span>}
    </div>
  );
}

/** Image unique (logo, couverture) stockée dans le bucket public `shops`. */
export function SingleImageField({ name, folder, initial, label, wide = false }: { name: string; folder: string; initial?: string | null; label: string; wide?: boolean }) {
  const [url, setUrl] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={url} />
      <button type="button" onClick={() => input.current?.click()} className={`stripes-sand relative flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-gold text-xs font-semibold text-gold-dark ${wide ? "h-32 w-full" : "h-24 w-24"}`}>
        {url ? <Image src={url} alt="" fill sizes={wide ? "600px" : "96px"} className="object-cover" /> : busy ? "Envoi…" : <span className="flex flex-col items-center gap-1"><Icon name="upload" size={18} />Choisir</span>}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setErr(null);
          try {
            setUrl((await uploadFile("shops", folder, f)).url);
          } catch (ex) {
            setErr((ex as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      {err && <span className="text-xs text-err">{err}</span>}
    </div>
  );
}
