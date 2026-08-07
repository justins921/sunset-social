import "server-only";
import postgres from "postgres";
import { TEAMS, SCHEDULE, RECAPS } from "@/data/league";

// ---------------------------------------------------------------------------
// Connection
//
// Reads the Postgres connection string that Vercel Postgres / Neon inject into
// the environment. When no connection string is present (e.g. local dev with no
// DB, or a preview before the store is linked) the app falls back to the static
// seed data in src/data — so the public site always renders.
// ---------------------------------------------------------------------------

function connectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    undefined
  );
}

export function hasDb(): boolean {
  return Boolean(connectionString());
}

type Sql = ReturnType<typeof postgres>;

// Cache the client across hot reloads / lambda invocations.
const globalForDb = globalThis as unknown as { __ssSql?: Sql };

export function getSql(): Sql | null {
  const url = connectionString();
  if (!url) return null;
  if (globalForDb.__ssSql) return globalForDb.__ssSql;

  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  const client = postgres(url, {
    ssl: isLocal ? false : "require",
    // Vercel Postgres / Neon poolers run pgbouncer in transaction mode.
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  globalForDb.__ssSql = client;
  return client;
}

// ---------------------------------------------------------------------------
// Deterministic IDs so seeding is idempotent and admin forms can address rows.
// ---------------------------------------------------------------------------

const SLOT_INDEX: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };
export const playerId = (teamId: number, slot: string) =>
  teamId * 10 + (SLOT_INDEX[slot] ?? 0);
export const weekId = (index: number) => index + 1;

// A week is part of the pre-adoption baseline (its per-player points are already
// summed into the baseline totals) if it is on or before this date.
const BASELINE_THROUGH = "2026-08-06";

// ---------------------------------------------------------------------------
// Schema + seed (idempotent). Safe to call on every request; it only does work
// the first time.
// ---------------------------------------------------------------------------

let ensured: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (ensured) return ensured;
  ensured = doEnsure().catch((e) => {
    // Reset so a transient failure can be retried on the next request.
    ensured = null;
    throw e;
  });
  return ensured;
}

async function doEnsure(): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  await sql`
    create table if not exists teams (
      id int primary key,
      name text not null,
      sort int not null default 0,
      baseline_points numeric not null default 0
    )`;
  await sql`
    create table if not exists players (
      id int primary key,
      team_id int not null references teams(id) on delete cascade,
      slot text not null,
      name text not null,
      phone text,
      sort int not null default 0,
      baseline_points numeric not null default 0
    )`;
  await sql`
    create table if not exists weeks (
      id int primary key,
      play_date date,
      label text not null,
      note text,
      sort int not null default 0,
      entry_open boolean not null default true
    )`;
  await sql`
    create table if not exists results (
      week_id int not null references weeks(id) on delete cascade,
      player_id int not null references players(id) on delete cascade,
      strokes int,
      points numeric,
      status text not null default 'played',
      primary key (week_id, player_id)
    )`;
  await sql`
    create table if not exists recaps (
      week_id int primary key references weeks(id) on delete cascade,
      low_scores text,
      fifty_fifty text
    )`;

  const [{ count }] = await sql<{ count: number }[]>`
    select count(*)::int as count from teams`;
  if (count > 0) return; // already seeded

  await seed(sql);
}

async function seed(sql: Sql): Promise<void> {
  await sql.begin(async (tx) => {
    for (let ti = 0; ti < TEAMS.length; ti++) {
      const t = TEAMS[ti];
      await tx`
        insert into teams (id, name, sort, baseline_points)
        values (${t.id}, ${t.name}, ${ti}, ${t.points})
        on conflict (id) do nothing`;
      for (let pi = 0; pi < t.players.length; pi++) {
        const p = t.players[pi];
        await tx`
          insert into players (id, team_id, slot, name, phone, sort, baseline_points)
          values (${playerId(t.id, p.slot)}, ${t.id}, ${p.slot}, ${p.name},
                  ${p.phone ?? null}, ${pi}, ${p.points ?? 0})
          on conflict (id) do nothing`;
      }
    }

    for (let wi = 0; wi < SCHEDULE.length; wi++) {
      const w = SCHEDULE[wi];
      const isBaseline = w.date <= BASELINE_THROUGH;
      await tx`
        insert into weeks (id, play_date, label, note, sort, entry_open)
        values (${weekId(wi)}, ${w.date}, ${w.label}, ${w.note ?? null}, ${wi},
                ${!isBaseline})
        on conflict (id) do nothing`;
    }

    // Seed any known recaps onto their week (matched by label).
    for (const r of RECAPS) {
      const idx = SCHEDULE.findIndex((w) => w.label === r.label);
      if (idx === -1) continue;
      await tx`
        insert into recaps (week_id, low_scores, fifty_fifty)
        values (${weekId(idx)}, ${r.lowScores ?? null}, ${r.fiftyFifty ?? null})
        on conflict (week_id) do update
          set low_scores = excluded.low_scores,
              fifty_fifty = excluded.fifty_fifty`;
    }
  });
}
