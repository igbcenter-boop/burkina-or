"use client";

import { Icon } from "@/components/icons";

export function PrintButton({ label = "Imprimer / Enregistrer en PDF" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn-gold no-print">
      <Icon name="printer" size={16} />
      {label}
    </button>
  );
}
