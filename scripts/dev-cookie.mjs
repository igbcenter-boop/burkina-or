// Outil de test local : connecte un compte et imprime l'en-tête Cookie
// attendu par @supabase/ssr. Usage : node scripts/dev-cookie.mjs email motdepasse (ne pas committer de sortie)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const [email, password] = process.argv.slice(2);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data, error } = await db.auth.signInWithPassword({ email, password });
if (error) { console.error(error.message); process.exit(1); }
const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\./)[1];
const name = `sb-${ref}-auth-token`;
const value = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
const chunks = value.match(/.{1,3180}/g);
console.log(chunks.length === 1 ? `${name}=${value}` : chunks.map((c, i) => `${name}.${i}=${c}`).join("; "));
