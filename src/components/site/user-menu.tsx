"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import { createClient } from "@/lib/supabase/client";
import { STAFF_ROLES } from "@/lib/labels";
import type { UserRole } from "@/lib/types";

type Me = { name: string; role: UserRole } | null;

export function useMe() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    const load = async (userId: string | undefined) => {
      if (!userId) return alive && setMe(null);
      const { data } = await supabase.from("profiles").select("full_name,role").eq("id", userId).maybeSingle();
      if (alive) setMe(data ? { name: data.full_name ?? "Mon compte", role: data.role as UserRole } : null);
    };
    supabase.auth.getUser().then(({ data }) => load(data.user?.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => load(session?.user?.id));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return me;
}

const PRO_ROLES: UserRole[] = ["bijoutier", "grossiste", "fondeur", "livreur", "super_admin", "admin"];

export function UserMenu() {
  const me = useMe();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!me) {
    return (
      <>
        <Link href="/connexion" className="hidden h-11 items-center gap-2 px-3 text-[13px] font-medium text-cream hover:text-gold-light lg:flex">
          <Icon name="user" size={18} />
          Se connecter
        </Link>
        <Link href="/connexion" aria-label="Compte" className="flex h-11 w-11 items-center justify-center text-cream lg:hidden">
          <Icon name="user" size={20} />
        </Link>
      </>
    );
  }

  const first = me.name.split(" ")[0];
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-11 items-center gap-2 border-0 bg-transparent px-2 text-[13px] font-medium text-cream lg:px-3"
      >
        <Icon name="user" size={18} />
        <span className="hidden lg:inline">{first}</span>
        <Icon name="chevron-down" size={14} className="hidden lg:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-60 overflow-hidden rounded-xl border border-line bg-white py-1.5 text-sm text-text shadow-[0_24px_48px_-24px_rgba(14,14,16,.45)]">
          <div className="border-b border-sand px-4 pb-2.5 pt-1.5">
            <div className="font-semibold">{me.name}</div>
          </div>
          <MenuLink href="/compte" icon="user" label="Mon compte" />
          <MenuLink href="/compte/commandes" icon="receipt" label="Mes commandes" />
          <MenuLink href="/compte/favoris" icon="heart" label="Mes favoris" />
          {PRO_ROLES.includes(me.role) && <MenuLink href="/pro" icon="store" label="Espace professionnel" />}
          {STAFF_ROLES.includes(me.role) && <MenuLink href="/admin" icon="dashboard" label="Administration" />}
          <button
            onClick={async () => {
              await createClient().auth.signOut();
              setOpen(false);
              router.push("/");
              router.refresh();
            }}
            className="flex w-full items-center gap-3 border-0 border-t border-sand bg-transparent px-4 py-2.5 text-left text-err"
          >
            <Icon name="logout" size={16} />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: "user" | "receipt" | "heart" | "store" | "dashboard"; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-2.5 text-text hover:bg-ivory hover:text-text">
      <Icon name={icon} size={16} className="text-gold-dark" />
      {label}
    </Link>
  );
}
