"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Icon } from "@/components/icons";
import { deleteProduct, setProductStatus } from "@/lib/actions/pro";
import type { ProductStatus } from "@/lib/types";

export function RowActions({ id, status }: { id: string; status: ProductStatus }) {
  const [pending, start] = useTransition();
  const locked = status === "suspended" || status === "removed";
  return (
    <div className="flex items-center gap-1.5">
      <Link href={`/pro/produits/${id}`} aria-label="Modifier" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-text">
        <Icon name="edit" size={15} />
      </Link>
      {!locked && (
        <button
          disabled={pending}
          onClick={() => start(() => setProductStatus(id, status === "published" ? "draft" : "published"))}
          className="h-9 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-text"
        >
          {status === "published" ? "Dépublier" : "Publier"}
        </button>
      )}
      <button
        disabled={pending}
        onClick={() => confirm("Supprimer définitivement ? (un produit déjà commandé sera archivé)") && start(() => deleteProduct(id))}
        aria-label="Supprimer"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-err"
      >
        <Icon name="trash" size={15} />
      </button>
    </div>
  );
}
