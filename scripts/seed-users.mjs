// Crée (ou met à jour) les comptes de démonstration et les rattache aux
// boutiques du jeu de données initial. Idempotent.
// Usage : npm run db:seed-users
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
for (const file of ['.env.local', '.env']) {
  const p = join(root, file)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.DEMO_PASSWORD
if (!url || !key || !password) {
  console.error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et DEMO_PASSWORD sont requis.')
  process.exit(1)
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const accounts = [
  { email: 'admin@burkinaor.bf', full_name: 'Mariam Compaoré', phone: '+226 70 00 12 48', role: 'super_admin', shops: ['a0000000-0000-4000-8000-000000000001'] },
  { email: 'conformite@burkinaor.bf', full_name: 'Ousmane Kaboré', phone: '+226 70 00 12 40', role: 'moderateur' },
  { email: 'conseil@burkinaor.bf', full_name: 'Rakiéta Kaboré', phone: '+226 70 00 12 30', role: 'conseiller' },
  { email: 'finance@burkinaor.bf', full_name: 'Ibrahim Sawadogo', phone: '+226 70 00 12 66', role: 'finance' },
  { email: 'awa.sawadogo@mail.bf', full_name: 'Awa Sawadogo', phone: '+226 70 12 34 56', city: 'Ouagadougou', address: 'Ouaga 2000, secteur 15', role: 'client', orders: ['BO-104873'] },
  { email: 'maison@ouedraogo-joaillerie.bf', full_name: 'Boukary Ouédraogo', phone: '+226 70 45 67 89', city: 'Koudougou', role: 'bijoutier', shops: ['a0000000-0000-4000-8000-000000000012'] },
  { email: 'contact@kanazoe.bf', full_name: 'Issa Kanazoé', phone: '+226 70 22 33 44', city: 'Ouagadougou', role: 'bijoutier', shops: ['a0000000-0000-4000-8000-000000000011'] },
  { email: 'commercial@fasometaux.bf', full_name: 'Souleymane Ouattara', phone: '+226 25 35 10 10', city: 'Ouagadougou', role: 'grossiste', shops: ['a0000000-0000-4000-8000-000000000021'] },
  { email: 'contact@wendyam-fonderie.bf', full_name: 'Pascal Yaméogo', phone: '+226 25 40 20 20', city: 'Ouagadougou', role: 'fondeur', shops: ['a0000000-0000-4000-8000-000000000031'] },
  { email: 'ops@fasosecur.bf', full_name: 'Issouf Kaboré', phone: '+226 70 66 55 44', city: 'Ouagadougou', role: 'livreur', shops: ['a0000000-0000-4000-8000-000000000041'] },
  { email: 'achats@sahelgold.bf', full_name: 'Adama Sankara', phone: '+226 70 88 77 66', city: 'Ouagadougou', role: 'grossiste', shops: ['a0000000-0000-4000-8000-000000000051'] },
]

const existing = new Map()
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) throw error
  for (const u of data.users) existing.set(u.email, u)
  if (data.users.length < 200) break
}

for (const a of accounts) {
  let user = existing.get(a.email)
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: a.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: a.full_name, phone: a.phone, city: a.city },
    })
    if (error) throw new Error(`${a.email} : ${error.message}`)
    user = data.user
    console.log(`+ ${a.email}`)
  } else {
    console.log(`= ${a.email}`)
  }
  const { error: pErr } = await admin.from('profiles').upsert({
    id: user.id, email: a.email, full_name: a.full_name, phone: a.phone, city: a.city ?? null, address: a.address ?? null, role: a.role, status: 'active',
  })
  if (pErr) throw new Error(`profil ${a.email} : ${pErr.message}`)
  if (a.shops) {
    const { error } = await admin.from('shops').update({ owner_id: user.id }).in('id', a.shops)
    if (error) throw new Error(`boutique ${a.email} : ${error.message}`)
  }
  if (a.orders) {
    const { error } = await admin.from('orders').update({ user_id: user.id }).in('number', a.orders)
    if (error) throw new Error(`commandes ${a.email} : ${error.message}`)
  }
}

// Notifications de bienvenue pour le compte client de démonstration
const awa = existing.get('awa.sawadogo@mail.bf') ?? (await admin.auth.admin.listUsers()).data.users.find((u) => u.email === 'awa.sawadogo@mail.bf')
if (awa) {
  const { count } = await admin.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', awa.id)
  if (!count) {
    await admin.from('notifications').insert([
      { user_id: awa.id, title: 'Votre colis est en route', body: 'Commande BO-104873 · en route vers Ouaga 2000.', link: '/compte/commandes/BO-104873' },
      { user_id: awa.id, title: 'Paiement reçu', body: 'Orange Money · 82 900 FCFA pour la commande BO-104873.', link: '/compte/commandes/BO-104873' },
    ])
  }
}

console.log(`\nComptes prêts. Mot de passe de démonstration : ${password}`)
