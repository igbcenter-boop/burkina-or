"use client";

import { Icon } from "@/components/icons";
import { toast } from "@/components/toast";
import { logExport } from "@/lib/actions/admin";

/** Téléchargement CSV + inscription au journal d'audit. */
export function ExportButton({ what, href, label = "Exporter CSV" }: { what: string; href: string; label?: string }) {
  return (
    <a
      href={href}
      onClick={() => {
        logExport(what);
        toast("Export en cours · le fichier va être téléchargé");
      }}
      className="flex h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-a-line bg-a-card px-4 text-[13px] font-semibold text-a-text hover:text-a-gold"
    >
      <Icon name="download" size={16} stroke={1.75} />
      {label}
    </a>
  );
}
