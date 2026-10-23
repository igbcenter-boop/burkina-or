"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "@/components/toast";
import { saveCategory } from "@/lib/actions/admin";
import type { FormState } from "@/lib/actions/public";

export function CategoryForm() {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(saveCategory, null);
  useEffect(() => {
    if (state?.ok) {
      toast("Catégorie créée");
      ref.current?.reset();
      router.refresh();
    }
  }, [state, router]);
  const input = "h-11 rounded-lg border border-a-line bg-a-input px-3 text-sm text-a-text outline-none";
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3 rounded-xl border border-a-line bg-a-card p-[22px]">
      <h2 className="m-0 text-base font-semibold">Nouvelle catégorie</h2>
      <input name="name" required placeholder="Nom (ex. Pendentifs)" className={input} />
      <select name="kind" className={input}>
        <option value="bijou">Bijoux</option>
        <option value="lingot">Lingotins</option>
        <option value="gros">Offres de gros</option>
        <option value="service">Services</option>
      </select>
      <input name="image_label" placeholder="Légende du visuel (facultatif)" className={input} />
      <input name="sort" type="number" defaultValue={10} className={input} />
      {state?.error && <span className="text-sm text-a-err">{state.error}</span>}
      <button disabled={pending} className="h-11 rounded-lg border-0 bg-gold text-sm font-semibold text-ink">
        Ajouter
      </button>
    </form>
  );
}
