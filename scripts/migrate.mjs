// Applique les migrations SQL de supabase/migrations sur le projet Supabase
// via l'API de gestion (jeton personnel SUPABASE_ACCESS_TOKEN).
// Usage : npm run db:migrate            (applique les migrations en attente)
//         npm run db:migrate -- --status (liste l'état sans rien appliquer)
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const p = join(root, file)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
}
loadEnv()

const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = process.env.SUPABASE_PROJECT_REF || (process.env.NEXT_PUBLIC_SUPABASE_URL || '').match(/https:\/\/([^.]+)\./)?.[1]
if (!token || !ref) {
  console.error('SUPABASE_ACCESS_TOKEN et SUPABASE_PROJECT_REF (ou NEXT_PUBLIC_SUPABASE_URL) sont requis.')
  process.exit(1)
}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status} : ${text}`)
  return text ? JSON.parse(text) : null
}

const dir = join(root, 'supabase', 'migrations')
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

await query(`create schema if not exists app_meta;
create table if not exists app_meta.migrations (name text primary key, applied_at timestamptz not null default now());`)

const applied = new Set((await query('select name from app_meta.migrations')).map((r) => r.name))

if (process.argv.includes('--status')) {
  for (const f of files) console.log(`${applied.has(f) ? '✓' : '·'} ${f}`)
  process.exit(0)
}

let count = 0
for (const f of files) {
  if (applied.has(f)) continue
  const sql = readFileSync(join(dir, f), 'utf8')
  process.stdout.write(`→ ${f} … `)
  try {
    await query(`begin;\n${sql}\ninsert into app_meta.migrations(name) values ('${f.replace(/'/g, "''")}');\ncommit;`)
    console.log('ok')
    count++
  } catch (err) {
    console.log('échec')
    console.error(err.message)
    process.exit(1)
  }
}
console.log(count ? `${count} migration(s) appliquée(s).` : 'Base à jour, aucune migration en attente.')
