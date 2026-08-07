import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { getSql, ensureSchema, playerId } from "@/lib/db";
import {
  teamStandings as staticTeamStandings,
  individualStandings as staticIndividualStandings,
  type RankedTeam,
  type RankedPlayer,
} from "@/lib/standings";
import { TEAMS, SCHEDULE, RECAPS } from "@/data/league";

// ---------------------------------------------------------------------------
// Standings (DB-first, static fallback)
// ---------------------------------------------------------------------------

export async function getTeamStandings(): Promise<RankedTeam[]> {
  noStore();
  const sql = getSql();
  if (!sql) return staticTeamStandings();
  try {
    await ensureSchema();
    const rows = await sql<
      { id: number; name: string; total: number }[]
    >`
      select t.id, t.name,
             (t.baseline_points + coalesce(sum(r.points), 0))::float8 as total
      from teams t
      join players p on p.team_id = t.id
      left join results r on r.player_id = p.id
      group by t.id, t.name, t.baseline_points
      order by total desc, t.id asc`;

    const byId = new Map(TEAMS.map((t) => [t.id, t]));
    return rows.map((row, i) => {
      const base = byId.get(row.id)!;
      return { ...base, points: row.total, place: i + 1 };
    });
  } catch (e) {
    console.error("getTeamStandings failed, using static data:", e);
    return staticTeamStandings();
  }
}

export async function getIndividualStandings(): Promise<RankedPlayer[]> {
  noStore();
  const sql = getSql();
  if (!sql) return staticIndividualStandings();
  try {
    await ensureSchema();
    const rows = await sql<
      { id: number; total: number }[]
    >`
      select p.id,
             (p.baseline_points + coalesce(sum(r.points), 0))::float8 as total
      from players p
      left join results r on r.player_id = p.id
      group by p.id, p.baseline_points`;

    const totalById = new Map(rows.map((r) => [r.id, r.total]));
    const flat = TEAMS.flatMap((t) =>
      t.players.map((p) => ({
        ...p,
        teamId: t.id,
        teamName: t.name,
        points: totalById.get(playerId(t.id, p.slot)) ?? p.points ?? 0,
      })),
    );
    return flat
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
      .map((p, i) => ({ ...p, place: i + 1 }));
  } catch (e) {
    console.error("getIndividualStandings failed, using static data:", e);
    return staticIndividualStandings();
  }
}

// ---------------------------------------------------------------------------
// Weekly results (public results page)
// ---------------------------------------------------------------------------

export type ResultRow = {
  playerId: number;
  name: string;
  teamName: string;
  slot: string;
  strokes: number | null;
  points: number | null;
  status: string;
};

export type WeekResults = {
  id: number;
  label: string;
  playDate: string | null;
  note: string | null;
  lowScores: string | null;
  fiftyFifty: string | null;
  rows: ResultRow[];
};

/** Weeks that have entered scores or a recap, most recent first. */
export async function getResultsWeeks(): Promise<WeekResults[]> {
  noStore();
  const sql = getSql();
  if (!sql) return staticResultsWeeks();
  try {
    await ensureSchema();
    const weeks = await sql<
      {
        id: number;
        label: string;
        play_date: string | null;
        note: string | null;
        low_scores: string | null;
        fifty_fifty: string | null;
      }[]
    >`
      select w.id, w.label, w.play_date, w.note,
             rc.low_scores, rc.fifty_fifty
      from weeks w
      left join recaps rc on rc.week_id = w.id
      where exists (select 1 from results r where r.week_id = w.id)
         or rc.week_id is not null
      order by w.sort desc`;

    if (weeks.length === 0) return [];

    const rows = await sql<
      {
        week_id: number;
        player_id: number;
        name: string;
        team_name: string;
        slot: string;
        strokes: number | null;
        points: number | null;
        status: string;
      }[]
    >`
      select r.week_id, r.player_id, p.name, t.name as team_name, p.slot,
             r.strokes, r.points::float8 as points, r.status
      from results r
      join players p on p.id = r.player_id
      join teams t on t.id = p.team_id
      order by r.points desc nulls last, r.strokes asc nulls last`;

    const byWeek = new Map<number, ResultRow[]>();
    for (const r of rows) {
      const list = byWeek.get(r.week_id) ?? [];
      list.push({
        playerId: r.player_id,
        name: r.name,
        teamName: r.team_name,
        slot: r.slot,
        strokes: r.strokes,
        points: r.points,
        status: r.status,
      });
      byWeek.set(r.week_id, list);
    }

    return weeks.map((w) => ({
      id: w.id,
      label: w.label,
      playDate: w.play_date,
      note: w.note,
      lowScores: w.low_scores,
      fiftyFifty: w.fifty_fifty,
      rows: byWeek.get(w.id) ?? [],
    }));
  } catch (e) {
    console.error("getResultsWeeks failed, using static data:", e);
    return staticResultsWeeks();
  }
}

// Fallback: show the static recaps (no per-player scores available without a DB).
function staticResultsWeeks(): WeekResults[] {
  return RECAPS.map((r) => {
    const idx = SCHEDULE.findIndex((w) => w.label === r.label);
    const w = idx >= 0 ? SCHEDULE[idx] : undefined;
    return {
      id: idx + 1,
      label: r.label,
      playDate: w?.date ?? null,
      note: w?.note ?? null,
      lowScores: r.lowScores ?? null,
      fiftyFifty: r.fiftyFifty ?? null,
      rows: [],
    };
  }).reverse();
}

// ---------------------------------------------------------------------------
// Admin reads
// ---------------------------------------------------------------------------

export type AdminWeek = {
  id: number;
  label: string;
  playDate: string | null;
  note: string | null;
  entryOpen: boolean;
  resultCount: number;
  hasRecap: boolean;
};

export async function getAdminWeeks(): Promise<AdminWeek[]> {
  noStore();
  const sql = getSql();
  if (!sql) return [];
  await ensureSchema();
  const rows = await sql<
    {
      id: number;
      label: string;
      play_date: string | null;
      note: string | null;
      entry_open: boolean;
      result_count: number;
      has_recap: boolean;
    }[]
  >`
    select w.id, w.label, w.play_date, w.note, w.entry_open,
           (select count(*)::int from results r where r.week_id = w.id) as result_count,
           exists(select 1 from recaps rc where rc.week_id = w.id) as has_recap
    from weeks w
    order by w.sort asc`;
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    playDate: r.play_date,
    note: r.note,
    entryOpen: r.entry_open,
    resultCount: r.result_count,
    hasRecap: r.has_recap,
  }));
}

export type EntryPlayer = {
  playerId: number;
  teamId: number;
  teamName: string;
  slot: string;
  name: string;
  strokes: number | null;
  points: number | null;
  status: string;
};

export type WeekEntry = {
  id: number;
  label: string;
  playDate: string | null;
  note: string | null;
  entryOpen: boolean;
  lowScores: string | null;
  fiftyFifty: string | null;
  players: EntryPlayer[];
};

export async function getWeekEntry(id: number): Promise<WeekEntry | null> {
  noStore();
  const sql = getSql();
  if (!sql) return null;
  await ensureSchema();

  const weekRows = await sql<
    {
      id: number;
      label: string;
      play_date: string | null;
      note: string | null;
      entry_open: boolean;
      low_scores: string | null;
      fifty_fifty: string | null;
    }[]
  >`
    select w.id, w.label, w.play_date, w.note, w.entry_open,
           rc.low_scores, rc.fifty_fifty
    from weeks w
    left join recaps rc on rc.week_id = w.id
    where w.id = ${id}`;
  if (weekRows.length === 0) return null;
  const w = weekRows[0];

  const players = await sql<
    {
      player_id: number;
      team_id: number;
      team_name: string;
      slot: string;
      name: string;
      strokes: number | null;
      points: number | null;
      status: string | null;
    }[]
  >`
    select p.id as player_id, p.team_id, t.name as team_name, p.slot, p.name,
           r.strokes, r.points::float8 as points, r.status
    from players p
    join teams t on t.id = p.team_id
    left join results r on r.player_id = p.id and r.week_id = ${id}
    order by p.team_id asc, p.sort asc`;

  return {
    id: w.id,
    label: w.label,
    playDate: w.play_date,
    note: w.note,
    entryOpen: w.entry_open,
    lowScores: w.low_scores,
    fiftyFifty: w.fifty_fifty,
    players: players.map((p) => ({
      playerId: p.player_id,
      teamId: p.team_id,
      teamName: p.team_name,
      slot: p.slot,
      name: p.name,
      strokes: p.strokes,
      points: p.points,
      status: p.status ?? "played",
    })),
  };
}

// ---------------------------------------------------------------------------
// Admin writes
// ---------------------------------------------------------------------------

export type ResultInput = {
  playerId: number;
  strokes: number | null;
  points: number | null;
  status: string;
};

export async function saveWeekResults(
  weekIdValue: number,
  entries: ResultInput[],
): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  await sql.begin(async (tx) => {
    for (const e of entries) {
      const blank =
        e.strokes === null && e.points === null && e.status === "played";
      if (blank) {
        // Nothing entered for this player — remove any stale row.
        await tx`delete from results
                 where week_id = ${weekIdValue} and player_id = ${e.playerId}`;
        continue;
      }
      await tx`
        insert into results (week_id, player_id, strokes, points, status)
        values (${weekIdValue}, ${e.playerId}, ${e.strokes}, ${e.points}, ${e.status})
        on conflict (week_id, player_id) do update
          set strokes = excluded.strokes,
              points = excluded.points,
              status = excluded.status`;
    }
  });
}

export async function saveRecap(
  weekIdValue: number,
  lowScores: string | null,
  fiftyFifty: string | null,
): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  if (!lowScores && !fiftyFifty) {
    await sql`delete from recaps where week_id = ${weekIdValue}`;
    return;
  }
  await sql`
    insert into recaps (week_id, low_scores, fifty_fifty)
    values (${weekIdValue}, ${lowScores}, ${fiftyFifty})
    on conflict (week_id) do update
      set low_scores = excluded.low_scores,
          fifty_fifty = excluded.fifty_fifty`;
}
