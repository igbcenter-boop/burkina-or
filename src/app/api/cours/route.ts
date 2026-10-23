import { getGoldQuote } from "@/lib/data";

/** Cours de l'or public (24 / 22 / 18 ct), rafraîchi côté client toutes les 60 s. */
export async function GET() {
  const quote = await getGoldQuote();
  return Response.json(quote, { headers: { "Cache-Control": "public, max-age=30" } });
}
