import "server-only";
import postgres from "postgres";
import { TEAMS, SCHEDULE, SUBS } from "@/data/league";
import { SEASON_2026 } from "@/data/season2026";
import {
  FIN_INCOME_2026,
  FIN_EXPENSE_2026,
  FIN_FIFTY_2026,
  FIN_OFFICERS,
} from "@/data/financials2026";
import { BANQUET_2026 } from "@/data/banquet2026";

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
const weekIdByDate = (date: string) =>
  weekId(SCHEDULE.findIndex((w) => w.date === date));

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
  // Official team points for a night. A team's total is NOT the sum of its
  // players' individual points — absent players still earn team points
  // (Rule 9), so team standings need their own series.
  await sql`
    create table if not exists team_results (
      week_id int not null references weeks(id) on delete cascade,
      team_id int not null references teams(id) on delete cascade,
      points numeric,
      primary key (week_id, team_id)
    )`;
  await sql`create table if not exists app_meta (key text primary key, value text)`;
  await sql`alter table weeks add column if not exists matchups text[]`;
  await sql`
    create table if not exists subs (
      id int primary key,
      name text not null,
      phone text,
      sort int not null default 0
    )`;
  await sql`
    create table if not exists dues (
      player_id int primary key references players(id) on delete cascade,
      paid boolean not null default false,
      amount numeric not null default 50,
      paid_on date,
      note text
    )`;
  await sql`
    create table if not exists transactions (
      id serial primary key,
      occurred_on date not null default current_date,
      description text not null,
      amount numeric not null,
      kind text not null default 'expense'
    )`;
  await sql`
    create table if not exists meetings (
      id serial primary key,
      meeting_date date,
      title text not null default 'League meeting',
      notes text,
      created_at timestamptz not null default now()
    )`;
  await sql`
    create table if not exists meeting_attendance (
      meeting_id int not null references meetings(id) on delete cascade,
      player_id int not null references players(id) on delete cascade,
      primary key (meeting_id, player_id)
    )`;
  // Full point-in-time snapshots of past seasons, saved before a reset.
  await sql`
    create table if not exists seasons (
      id serial primary key,
      label text not null,
      archived_on date not null default current_date,
      champion text,
      data jsonb not null
    )`;
  // Treasury / financial report ledgers (mirrors the treasurer's balance sheet).
  await sql`
    create table if not exists fin_income (
      id serial primary key, occurred_on date, description text not null,
      amount numeric not null, category text
    )`;
  await sql`
    create table if not exists fin_expense (
      id serial primary key, occurred_on date, description text not null,
      amount numeric not null, check_no text
    )`;
  await sql`
    create table if not exists fin_5050 (
      id serial primary key, occurred_on date, winner text, amount numeric not null
    )`;
  // Drawing type: the weekly 50/50, or a Fun Night $100 / $50 drawing.
  await sql`alter table fin_5050 add column if not exists kind text not null default '50/50'`;
  // Itemized line-items under an expense (e.g. each prize on a receipt).
  await sql`
    create table if not exists fin_expense_item (
      id serial primary key,
      expense_id int not null references fin_expense(id) on delete cascade,
      description text not null,
      amount numeric not null default 0,
      sort int not null default 0
    )`;
  // Year-end banquet script / run-of-show, one editable record per season.
  await sql`
    create table if not exists banquet (
      season int primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )`;

  // Once initialized, the database is the source of truth for rosters/schedule,
  // so admin edits survive every redeploy.
  const initialized =
    (await sql`select value from app_meta where key = 'initialized'`).length > 0;
  if (!initialized) {
    // Fresh database, or one an earlier deploy created tables in before this
    // authoritative model existed.
    await seedBase(sql); // inserts missing rows; syncs weeks/subs from code once
    await sql`
      insert into app_meta (key, value) values ('initialized', '1')
      on conflict (key) do nothing`;
  }

  // Always: load any season week from the code that has no data in the database
  // yet. This seeds a fresh database with the full season, and lets a new week
  // added to season2026.ts reach an already-live database on deploy — without
  // ever touching a week that already has loaded or admin-entered results.
  await loadMissingSeasonWeeks(sql);

  // One-time load of the 2026 financial report (guarded by a marker so it never
  // reloads or overwrites treasurer edits).
  await loadFinancialsIfMissing(sql);

  // One-time sync of the current officer slate. Independent of the financial
  // load above so it also reaches a DB seeded before titles existed.
  await syncOfficersIfNeeded(sql);

  // One-time backfill of expense line-items for a database that loaded the
  // financials before itemization existed (matched to the parent by check
  // number, then marked done). Independent of the financial-load marker.
  await syncExpenseItemsIfNeeded(sql);

  // One-time load of the banquet script (guarded so admin edits are never lost).
  await loadBanquetIfMissing(sql);

  // One-time overwrite of the 2026 banquet with the finalized results. Runs once
  // (like the officer sync) so a database seeded with the earlier placeholder
  // picks up the real door-prize winners and 50/50, then never clobbers edits.
  await syncBanquetActualsIfNeeded(sql);
}

async function loadBanquetIfMissing(sql: Sql): Promise<void> {
  const exists =
    (await sql`select 1 from banquet where season = ${BANQUET_2026.year}`).length > 0;
  if (exists) return;
  await sql`insert into banquet (season, data) values (${BANQUET_2026.year}, ${sql.json(
    BANQUET_2026,
  )})
            on conflict (season) do nothing`;
}

async function syncBanquetActualsIfNeeded(sql: Sql): Promise<void> {
  const synced =
    (await sql`select value from app_meta where key = 'banquet_2026_actuals'`).length > 0;
  if (synced) return;
  await sql`insert into banquet (season, data, updated_at)
            values (${BANQUET_2026.year}, ${sql.json(BANQUET_2026)}, now())
            on conflict (season) do update set data = excluded.data, updated_at = now()`;
  await sql`insert into app_meta (key, value) values ('banquet_2026_actuals', '1')
            on conflict (key) do nothing`;
}

async function loadFinancialsIfMissing(sql: Sql): Promise<void> {
  const marked =
    (await sql`select value from app_meta where key = 'fin_2026_loaded'`).length > 0;
  if (marked) return;
  const [{ n }] = await sql<{ n: number }[]>`
    select (
      (select count(*) from fin_income) +
      (select count(*) from fin_expense) +
      (select count(*) from fin_5050)
    )::int as n`;
  if (n === 0) {
    await sql.begin(async (tx) => {
      for (const r of FIN_INCOME_2026)
        await tx`insert into fin_income (occurred_on, description, amount, category)
                 values (${r.date}, ${r.description}, ${r.amount}, ${r.category})`;
      for (const r of FIN_EXPENSE_2026) {
        const [{ id }] = await tx<{ id: number }[]>`
          insert into fin_expense (occurred_on, description, amount, check_no)
          values (${r.date}, ${r.description}, ${r.amount}, ${r.checkNo})
          returning id`;
        await insertExpenseItems(tx as unknown as Sql, id, r.items);
      }
      for (const r of FIN_FIFTY_2026)
        await tx`insert into fin_5050 (occurred_on, winner, amount)
                 values (${r.date}, ${r.winner}, ${r.amount})`;
    });
  }
  await sql`insert into app_meta (key, value) values ('fin_2026_loaded', '1')
            on conflict (key) do nothing`;
}

async function insertExpenseItems(
  tx: Sql,
  expenseId: number,
  items: { description: string; amount: number }[] | undefined,
): Promise<void> {
  if (!items) return;
  for (let i = 0; i < items.length; i++)
    await tx`insert into fin_expense_item (expense_id, description, amount, sort)
             values (${expenseId}, ${items[i].description}, ${items[i].amount}, ${i})`;
}

async function syncExpenseItemsIfNeeded(sql: Sql): Promise<void> {
  const synced =
    (await sql`select value from app_meta where key = 'fin_items_2026_loaded'`).length > 0;
  if (synced) return;
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from fin_expense_item`;
  if (n === 0) {
    for (const r of FIN_EXPENSE_2026) {
      if (!r.items) continue;
      const match = r.checkNo
        ? await sql<{ id: number }[]>`select id from fin_expense where check_no = ${r.checkNo} order by id limit 1`
        : await sql<{ id: number }[]>`select id from fin_expense where check_no is null and description = ${r.description} order by id limit 1`;
      if (match[0]) await insertExpenseItems(sql, match[0].id, r.items);
    }
  }
  await sql`insert into app_meta (key, value) values ('fin_items_2026_loaded', '1')
            on conflict (key) do nothing`;
}

// Writes the current officer slate (name + title) once, then marks itself done
// so it never overwrites later admin edits. Runs on every deploy until the
// marker is set, which is what upgrades a DB seeded before titles existed.
async function syncOfficersIfNeeded(sql: Sql): Promise<void> {
  const synced =
    (await sql`select value from app_meta where key = 'officers_titled_loaded'`).length > 0;
  if (synced) return;
  for (const [k, v] of officerMeta())
    await sql`insert into app_meta (key, value) values (${k}, ${v})
              on conflict (key) do update set value = excluded.value`;
  await sql`insert into app_meta (key, value) values ('officers_titled_loaded', '1')
            on conflict (key) do nothing`;
}

function officerMeta(): [string, string][] {
  return FIN_OFFICERS.flatMap((o, i) => [
    [`officer${i + 1}_name`, o.name],
    [`officer${i + 1}_title`, o.title],
  ]) as [string, string][];
}

async function seedBase(sql: Sql): Promise<void> {
  await sql.begin(async (tx) => {
    // Rosters: insert if missing, never overwrite existing (preserves any
    // admin edits made before this one-time seed marked the DB initialized).
    for (let ti = 0; ti < TEAMS.length; ti++) {
      const t = TEAMS[ti];
      await tx`
        insert into teams (id, name, sort, baseline_points)
        values (${t.id}, ${t.name}, ${ti}, 0)
        on conflict (id) do nothing`;
      for (let pi = 0; pi < t.players.length; pi++) {
        const p = t.players[pi];
        await tx`
          insert into players (id, team_id, slot, name, phone, sort, baseline_points)
          values (${playerId(t.id, p.slot)}, ${t.id}, ${p.slot}, ${p.name},
                  ${p.phone ?? null}, ${pi}, 0)
          on conflict (id) do nothing`;
      }
    }

    // Weeks + matchups: sync from code once (applies the corrected schedule to
    // a database seeded by an earlier deploy).
    for (let wi = 0; wi < SCHEDULE.length; wi++) {
      const w = SCHEDULE[wi];
      await tx`
        insert into weeks (id, play_date, label, note, sort, entry_open, matchups)
        values (${weekId(wi)}, ${w.date}, ${w.label}, ${w.note ?? null}, ${wi}, true,
                ${w.matchups ?? null})
        on conflict (id) do update
          set play_date = excluded.play_date, label = excluded.label,
              note = excluded.note, sort = excluded.sort, matchups = excluded.matchups`;
    }

    for (let si = 0; si < SUBS.length; si++) {
      const s = SUBS[si];
      await tx`
        insert into subs (id, name, phone, sort)
        values (${si + 1}, ${s.name}, ${s.phone ?? null}, ${si})
        on conflict (id) do nothing`;
    }
  });
}

async function loadMissingSeasonWeeks(sql: Sql): Promise<void> {
  for (const wk of SEASON_2026) {
    const wid = weekIdByDate(wk.date);
    if (wid <= 0) continue;

    // Skip a week that already has any data — never overwrite entered results.
    const [{ has }] = await sql<{ has: boolean }[]>`
      select (
        exists(select 1 from results where week_id = ${wid})
        or exists(select 1 from team_results where week_id = ${wid})
      ) as has`;
    if (has) continue;

    await sql.begin(async (tx) => {
      for (const r of wk.results) {
        await tx`
          insert into results (week_id, player_id, strokes, points, status)
          values (${wid}, ${playerId(r.team, slotLetter(r.slot))},
                  ${r.strokes}, ${r.points}, 'played')
          on conflict (week_id, player_id) do update
            set strokes = excluded.strokes, points = excluded.points`;
      }
      for (const [teamId, pts] of Object.entries(wk.teamPoints)) {
        await tx`
          insert into team_results (week_id, team_id, points)
          values (${wid}, ${Number(teamId)}, ${pts})
          on conflict (week_id, team_id) do update set points = excluded.points`;
      }
      if (wk.lowScores || wk.fiftyFifty) {
        await tx`
          insert into recaps (week_id, low_scores, fifty_fifty)
          values (${wid}, ${wk.lowScores}, ${wk.fiftyFifty})
          on conflict (week_id) do update
            set low_scores = excluded.low_scores, fifty_fifty = excluded.fifty_fifty`;
      }
    });
  }
}

const SLOTS = ["A", "B", "C", "D"] as const;
const slotLetter = (slot: number) => SLOTS[slot - 1];
