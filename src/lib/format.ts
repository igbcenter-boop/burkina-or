/** 78450 → « 78 450 » (espaces simples, comme dans les maquettes). */
export function n0(v: number | null | undefined): string {
  return Math.round(Number(v ?? 0)).toLocaleString("fr-FR").replace(/ | /g, " ");
}

export function fcfa(v: number | null | undefined): string {
  return n0(v) + " FCFA";
}

/** 1.24 → « 1,24 » */
export function dec(v: number, digits = 2): string {
  return v.toFixed(digits).replace(".", ",");
}

export function pct(v: number, digits = 2): string {
  return (v >= 0 ? "▲ +" : "▼ ") + dec(v, digits) + " %";
}

/** Poids : 6.8 → « 6,8 g » ; 1 → « 1 g ». */
export function grams(v: number | null | undefined): string {
  if (v == null) return "—";
  const n = Number(v);
  return (Number.isInteger(n) ? String(n) : dec(n, n < 10 ? 2 : 1).replace(/,?0+$/, "")) + " g";
}

/** Numéro de commande « BO-104873 » → « BO-104 873 ». */
export function orderNo(n: string): string {
  return n.replace(/^(BO-)(\d{3})(\d+)$/, "$1$2 $3");
}

const tz = "Africa/Ouagadougou";

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: tz });
}

export function dateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: tz });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: tz }) +
    " " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: tz })
  );
}

/** « 21/10 10:42 » */
export function dateCompact(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: tz }) +
    " " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: tz })
  );
}

/** « 21/10/2026 10:41:12 » */
export function timestamp(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: tz }) +
    " " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz })
  );
}

/** « il y a 3 j », « il y a 26 h », « il y a 4 min » */
export function since(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `il y a ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 48 * 3600) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "BO";
  const parts = name.replace(/[«»"]/g, "").trim().split(/\s+/).filter((p) => !/^(de|du|des|la|le|l'|d'|&)$/i.test(p));
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? "")).toUpperCase();
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function plural(n: number, one: string, many = one + "s"): string {
  return `${n} ${n > 1 ? many : one}`;
}
