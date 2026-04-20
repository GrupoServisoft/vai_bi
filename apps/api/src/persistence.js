import { Pool } from 'pg'
import { config } from './config.js'

let pool = null

function getPool() {
  if (!config.databaseUrl) return null
  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl })
  }
  return pool
}

export async function saveSyncSnapshot(kind, payload) {
  const pg = getPool()
  if (!pg) {
    return { persisted: false, reason: 'DATABASE_URL no configurada' }
  }

  await pg.query(`
    create table if not exists sync_snapshots (
      id serial primary key,
      kind varchar(100) not null,
      payload jsonb not null,
      created_at timestamptz not null default now()
    )
  `)

  await pg.query('insert into sync_snapshots(kind, payload) values ($1, $2::jsonb)', [kind, JSON.stringify(payload)])
  return { persisted: true }
}
