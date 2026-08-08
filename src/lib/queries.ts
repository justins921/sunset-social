import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { getSql, ensureSchema, playerId } from "@/lib/db";
import {
  teamStandings as staticTeamStandings,
  individualStandings as staticIndividualStandings,
  type RankedTeam,
  type RankedPlayer,
} from "@/lib/standings";
import { TEAMS, type Player } from "@/data/league";
import { SEASON_2026 } from "@/data/season2026";

type Sql = NonNullable<ReturnType<typeof getSql>>;

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
             (t.baseline_points + coalesce(sum(tr.points), 0))::float8 as total
      from teams t
      left join team_results tr on tr.team_id = t.id
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

export type RankedPlayerH = RankedPlayer & { handicap: number | null };

export async function getIndividualStandings(): Promise<RankedPlayerH[]> {
  noStore();
  const sql = getSql();
  if (!sql) return staticIndividualStandings().map((p) => ({ ...p, handicap: null }));
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
    const hcp = await handicapMap(sql);
    const flat = TEAMS.flatMap((t) =>
      t.players.map((p) => ({
        ...p,
        teamId: t.id,
        teamName: t.name,
        points: totalById.get(playerId(t.id, p.slot)) ?? p.points ?? 0,
        handicap: hcp.get(playerId(t.id, p.slot)) ?? null,
      })),
    );
    return flat
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
      .map((p, i) => ({ ...p, place: i + 1 }));
  } catch (e) {
    console.error("getIndividualStandings failed, using static data:", e);
    return staticIndividualStandings().map((p) => ({ ...p, handicap: null }));
  }
}

// ---------------------------------------------------------------------------
// Handicaps (Rule 10): the average of a golfer's most recent (up to four)
// 9-hole gross scores minus par 35, with no single score over double par (70)
// counted. Floored at 0 and rounded to a whole stroke.
// ---------------------------------------------------------------------------

async function handicapMap(sql: Sql): Promise<Map<number, number>> {
  const rows = await sql<{ player_id: number; strokes: number }[]>`
    select r.player_id, r.strokes
    from results r
    join weeks w on w.id = r.week_id
    where r.strokes is not null
    order by w.sort desc`;
  const recent = new Map<number, number[]>();
  for (const r of rows) {
    const list = recent.get(r.player_id) ?? [];
    if (list.length < 4) list.push(Math.min(r.strokes, 70));
    recent.set(r.player_id, list);
  }
  const out = new Map<number, number>();
  for (const [pid, arr] of recent) {
    const avg = arr.reduce((s, x) => s + x, 0) / arr.length;
    out.set(pid, Math.max(0, Math.round(avg - 35)));
  }
  return out;
}

export async function getHandicaps(): Promise<Map<number, number>> {
  const sql = getSql();
  if (!sql) return new Map();
  try {
    await ensureSchema();
    return await handicapMap(sql);
  } catch {
    return new Map();
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

export type TeamPointRow = { teamId: number; teamName: string; points: number };

export type WeekResults = {
  id: number;
  label: string;
  playDate: string | null;
  note: string | null;
  lowScores: string | null;
  fiftyFifty: string | null;
  rows: ResultRow[];
  teamPoints: TeamPointRow[];
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

    const teamRows = await sql<
      { week_id: number; team_id: number; team_name: string; points: number }[]
    >`
      select tr.week_id, tr.team_id, t.name as team_name, tr.points::float8 as points
      from team_results tr
      join teams t on t.id = tr.team_id
      order by tr.points desc nulls last, tr.team_id asc`;
    const teamByWeek = new Map<number, TeamPointRow[]>();
    for (const tr of teamRows) {
      const list = teamByWeek.get(tr.week_id) ?? [];
      list.push({ teamId: tr.team_id, teamName: tr.team_name, points: tr.points });
      teamByWeek.set(tr.week_id, list);
    }

    return weeks.map((w) => ({
      id: w.id,
      label: w.label,
      playDate: w.play_date,
      note: w.note,
      lowScores: w.low_scores,
      fiftyFifty: w.fifty_fifty,
      rows: byWeek.get(w.id) ?? [],
      teamPoints: teamByWeek.get(w.id) ?? [],
    }));
  } catch (e) {
    console.error("getResultsWeeks failed, using static data:", e);
    return staticResultsWeeks();
  }
}

// Fallback: render the full validated season directly from the seed file when
// no database is connected, so /results still shows real scorecards.
function staticResultsWeeks(): WeekResults[] {
  const teamName = new Map(TEAMS.map((t) => [t.id, t.name]));
  const slotName = (team: number, slot: number) =>
    TEAMS.find((t) => t.id === team)?.players.find(
      (p) => p.slot === (["A", "B", "C", "D"][slot - 1] as Player["slot"]),
    )?.name ?? `${team}.${slot}`;

  return SEASON_2026.map((wk, i) => {
    const rows: ResultRow[] = wk.results
      .map((r) => ({
        playerId: r.team * 10 + r.slot,
        name: slotName(r.team, r.slot),
        teamName: teamName.get(r.team) ?? `Team ${r.team}`,
        slot: ["A", "B", "C", "D"][r.slot - 1],
        strokes: r.strokes,
        points: r.points,
        status: "played",
      }))
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
    const teamPoints: TeamPointRow[] = Object.entries(wk.teamPoints)
      .map(([id, pts]) => ({
        teamId: Number(id),
        teamName: teamName.get(Number(id)) ?? `Team ${id}`,
        points: pts,
      }))
      .sort((a, b) => b.points - a.points);
    return {
      id: i + 1,
      label: wk.label,
      playDate: wk.date,
      note: null,
      lowScores: wk.lowScores,
      fiftyFifty: wk.fiftyFifty,
      rows,
      teamPoints,
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
  teamPoints: Record<number, number | null>;
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

  const teamPts = await sql<{ team_id: number; points: number | null }[]>`
    select team_id, points::float8 as points from team_results where week_id = ${id}`;
  const teamPoints: Record<number, number | null> = {};
  for (const tp of teamPts) teamPoints[tp.team_id] = tp.points;

  return {
    id: w.id,
    label: w.label,
    playDate: w.play_date,
    note: w.note,
    entryOpen: w.entry_open,
    lowScores: w.low_scores,
    fiftyFifty: w.fifty_fifty,
    teamPoints,
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

export async function saveTeamPoints(
  weekIdValue: number,
  points: { teamId: number; points: number | null }[],
): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  await sql.begin(async (tx) => {
    for (const tp of points) {
      if (tp.points === null) {
        await tx`delete from team_results
                 where week_id = ${weekIdValue} and team_id = ${tp.teamId}`;
        continue;
      }
      await tx`
        insert into team_results (week_id, team_id, points)
        values (${weekIdValue}, ${tp.teamId}, ${tp.points})
        on conflict (week_id, team_id) do update set points = excluded.points`;
    }
  });
}
