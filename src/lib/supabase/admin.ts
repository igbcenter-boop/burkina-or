import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client « service role » : contourne la RLS. À n'utiliser que côté serveur,
 * après avoir vérifié les droits de l'utilisateur courant.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
