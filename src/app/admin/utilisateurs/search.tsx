"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";

export function UserSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const p = new URLSearchParams(sp.toString());
        if (q.trim()) p.set("q", q.trim());
        else p.delete("q");
        router.replace(`${path}?${p}`, { scroll: false });
      }}
      className="flex h-[38px] items-center gap-2 rounded-full border border-a-line bg-a-card px-3.5 text-a-muted"
    >
      <Icon name="search" size={15} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, e-mail, téléphone" className="w-48 border-0 bg-transparent text-[13px] text-a-text outline-none" />
    </form>
  );
}
