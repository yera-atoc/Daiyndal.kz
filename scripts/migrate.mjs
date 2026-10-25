#!/usr/bin/env node
// Миграцияларды ретімен қолдану: supabase/migrations/*.sql
//   DATABASE_URL=postgres://... node scripts/migrate.mjs          – қолдану
//   DATABASE_URL=postgres://... node scripts/migrate.mjs --status – тек тізім
// Қолданылғандары schema_migrations кестесіне жазылады, екінші рет іске қосылмайды.
// Әр файл бөлек транзакцияда: қате болса – сол файл толық кері қайтарылады.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const dir = join(process.cwd(), 'supabase', 'migrations')
const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL орнатылмаған (Supabase → Project Settings → Database → Connection string)')
  process.exit(1)
}
const statusOnly = process.argv.includes('--status')
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

const client = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1|host=\/tmp/.test(url) ? false : { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query(`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`)
  await client.query(`alter table schema_migrations enable row level security`)
  const done = new Set((await client.query('select name from schema_migrations')).rows.map((r) => r.name))
  const todo = files.filter((f) => !done.has(f))
  for (const f of files) console.log(`${done.has(f) ? '✓' : '·'} ${f}`)
  if (statusOnly || !todo.length) {
    console.log(todo.length ? `${todo.length} миграция күтуде` : 'Барлығы қолданылған')
    process.exit(0)
  }
  for (const f of todo) {
    const sql = readFileSync(join(dir, f), 'utf8')
    process.stdout.write(`→ ${f} … `)
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('insert into schema_migrations (name) values ($1)', [f])
      await client.query('commit')
      console.log('OK')
    } catch (e) {
      await client.query('rollback')
      console.log('ҚАТЕ')
      console.error(e.message)
      process.exit(1)
    }
  }
} finally {
  await client.end()
}
