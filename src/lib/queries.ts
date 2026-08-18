import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { getSql, ensureSchema, playerId } from "@/lib/db";
import {
  teamStandings as staticTeamStandings,
  individualStandings as staticIndividualStandings,
  type RankedTeam,
  type RankedPlayer,
} from "@/lib/standings";
import { TEAMS, SCHEDULE, type Player } from "@/data/league";
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
    const roster = await getRoster();
    const rows = await sql<{ team_id: number; pts: number }[]>`
      select team_id, coalesce(sum(points), 0)::float8 as pts
      from team_results group by team_id`;
    const ptsByTeam = new Map(rows.map((r) => [r.team_id, r.pts]));
    return roster.teams
      .map((t) => ({
        id: t.id,
        name: t.name,
        points: ptsByTeam.get(t.id) ?? 0,
        players: t.players.map((p) => ({
          slot: p.slot as Player["slot"],
          name: p.name,
          phone: p.phone ?? undefined,
        })),
      }))
      .sort((a, b) => b.points - a.points)
      .map((t, i) => ({ ...t, place: i + 1 }));
  } catch (e) {
    console.error("getTeamStandings failed, using static data:", e);
    return staticTeamStandings();
  }
}

// ---------------------------------------------------------------------------
// Roster (teams, players, subs) — DB-first, code fallback. This is the source
// of truth for names/slots once the database is initialized.
// ---------------------------------------------------------------------------

export type RosterPlayer = {
  id: number;
  teamId: number;
  slot: string;
  name: string;
  phone: string | null;
  sort: number;
};
export type RosterTeam = {
  id: number;
  name: string;
  sort: number;
  players: RosterPlayer[];
};
export type RosterSub = { id: number; name: string; phone: string | null };
export type Roster = { teams: RosterTeam[]; subs: RosterSub[] };

function codeRoster(): Roster {
  return {
    teams: TEAMS.map((t, i) => ({
      id: t.id,
      name: t.name,
      sort: i,
      players: t.players.map((p, pi) => ({
        id: playerId(t.id, p.slot),
        teamId: t.id,
        slot: p.slot,
        name: p.name,
        phone: p.phone ?? null,
        sort: pi,
      })),
    })),
    subs: [],
  };
}

export async function getRoster(): Promise<Roster> {
  const sql = getSql();
  if (!sql) return codeRoster();
  try {
    await ensureSchema();
    const [teams, players, subs] = await Promise.all([
      sql<{ id: number; name: string; sort: number }[]>`
        select id, name, sort from teams order by sort asc, id asc`,
      sql<RosterPlayer[]>`
        select id, team_id as "teamId", slot, name, phone, sort
        from players order by team_id asc, sort asc, slot asc`,
      sql<RosterSub[]>`select id, name, phone from subs order by sort asc, id asc`,
    ]);
    const byTeam = new Map<number, RosterTeam>();
    for (const t of teams) byTeam.set(t.id, { ...t, players: [] });
    for (const p of players) byTeam.get(p.teamId)?.players.push(p);
    return { teams: [...byTeam.values()], subs };
  } catch (e) {
    console.error("getRoster failed, using code roster:", e);
    return codeRoster();
  }
}

export type RankedPlayerH = RankedPlayer & { handicap: number | null };

export async function getIndividualStandings(): Promise<RankedPlayerH[]> {
  noStore();
  const sql = getSql();
  if (!sql) return staticIndividualStandings().map((p) => ({ ...p, handicap: null }));
  try {
    await ensureSchema();
    const roster = await getRoster();
    const rows = await sql<{ player_id: number; total: number }[]>`
      select player_id, coalesce(sum(points), 0)::float8 as total
      from results group by player_id`;
    const totalById = new Map(rows.map((r) => [r.player_id, r.total]));
    const hcp = await handicapMap(sql);
    const flat = roster.teams.flatMap((t) =>
      t.players.map((p) => ({
        slot: p.slot as Player["slot"],
        name: p.name,
        phone: p.phone ?? undefined,
        teamId: t.id,
        teamName: t.name,
        points: totalById.get(p.id) ?? 0,
        handicap: hcp.get(p.id) ?? null,
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

// ---------------------------------------------------------------------------
// Printable weekly report (a night's scorecards + standings AS OF that week)
// ---------------------------------------------------------------------------

export type ReportPlayer = {
  slot: string;
  name: string;
  strokes: number | null;
  points: number | null;
  status: string;
};
export type ReportTeamCard = {
  teamId: number;
  name: string;
  teamPoints: number | null;
  players: ReportPlayer[];
};
export type ReportStanding = { id: number; name: string; points: number; place: number };
export type ReportIndividual = {
  place: number;
  name: string;
  teamName: string;
  points: number;
  handicap: number | null;
};
export type WeekReport = {
  id: number;
  label: string;
  playDate: string | null;
  note: string | null;
  lowScores: string | null;
  fiftyFifty: string | null;
  cards: ReportTeamCard[];
  teamStandings: ReportStanding[];
  individual: ReportIndividual[];
};

export async function getWeekReport(id: number): Promise<WeekReport | null> {
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
      sort: number;
      low_scores: string | null;
      fifty_fifty: string | null;
    }[]
  >`
    select w.id, w.label, w.play_date::text as play_date, w.note, w.sort,
           rc.low_scores, rc.fifty_fifty
    from weeks w left join recaps rc on rc.week_id = w.id
    where w.id = ${id}`;
  if (weekRows.length === 0) return null;
  const w = weekRows[0];

  const roster = await getRoster();
  const teamName = new Map(roster.teams.map((t) => [t.id, t.name]));

  // This week's scorecards
  const rows = await sql<
    { team_id: number; slot: string; name: string; strokes: number | null; points: number | null; status: string }[]
  >`
    select p.team_id, p.slot, p.name, r.strokes, r.points::float8 as points, r.status
    from results r join players p on p.id = r.player_id
    where r.week_id = ${id}
    order by p.team_id asc, p.sort asc`;
  const teamPts = await sql<{ team_id: number; points: number | null }[]>`
    select team_id, points::float8 as points from team_results where week_id = ${id}`;
  const ptsByTeam = new Map(teamPts.map((t) => [t.team_id, t.points]));

  const cardMap = new Map<number, ReportTeamCard>();
  for (const t of roster.teams) {
    if (rows.some((r) => r.team_id === t.id) || ptsByTeam.has(t.id)) {
      cardMap.set(t.id, {
        teamId: t.id,
        name: t.name,
        teamPoints: ptsByTeam.get(t.id) ?? null,
        players: [],
      });
    }
  }
  for (const r of rows) {
    cardMap.get(r.team_id)?.players.push({
      slot: r.slot,
      name: r.name,
      strokes: r.strokes,
      points: r.points,
      status: r.status,
    });
  }
  const cards = [...cardMap.values()].sort(
    (a, b) => (b.teamPoints ?? 0) - (a.teamPoints ?? 0),
  );

  // Standings as of this week (only weeks up to and including this one)
  const teamSums = await sql<{ team_id: number; pts: number }[]>`
    select tr.team_id, coalesce(sum(tr.points), 0)::float8 as pts
    from team_results tr join weeks wk on wk.id = tr.week_id
    where wk.sort <= ${w.sort} group by tr.team_id`;
  const teamStandings: ReportStanding[] = roster.teams
    .map((t) => ({
      id: t.id,
      name: t.name,
      points: teamSums.find((s) => s.team_id === t.id)?.pts ?? 0,
    }))
    .sort((a, b) => b.points - a.points)
    .map((t, i) => ({ ...t, place: i + 1 }));

  const indivSums = await sql<{ player_id: number; pts: number }[]>`
    select r.player_id, coalesce(sum(r.points), 0)::float8 as pts
    from results r join weeks wk on wk.id = r.week_id
    where wk.sort <= ${w.sort} group by r.player_id`;
  const ptsByPlayer = new Map(indivSums.map((s) => [s.player_id, s.pts]));
  const hcp = await handicapMap(sql);
  const individual: ReportIndividual[] = roster.teams
    .flatMap((t) =>
      t.players.map((p) => ({
        name: p.name,
        teamName: teamName.get(t.id) ?? `Team ${t.id}`,
        points: ptsByPlayer.get(p.id) ?? 0,
        handicap: hcp.get(p.id) ?? null,
      })),
    )
    .sort((a, b) => b.points - a.points)
    .map((p, i) => ({ ...p, place: i + 1 }));

  return {
    id: w.id,
    label: w.label,
    playDate: w.play_date,
    note: w.note,
    lowScores: w.low_scores,
    fiftyFifty: w.fifty_fifty,
    cards,
    teamStandings,
    individual,
  };
}

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
      select w.id, w.label, w.play_date::text as play_date, w.note,
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
    select w.id, w.label, w.play_date::text as play_date, w.note, w.entry_open,
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
    select w.id, w.label, w.play_date::text as play_date, w.note, w.entry_open,
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

// ---------------------------------------------------------------------------
// Roster editing (team builder)
// ---------------------------------------------------------------------------

export type RosterSave = {
  teams: { id: number; name: string; players: { id: number; name: string; phone: string | null }[] }[];
};

export async function saveRoster(data: RosterSave): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  await sql.begin(async (tx) => {
    for (const t of data.teams) {
      if (t.name.trim()) {
        await tx`update teams set name = ${t.name.trim()} where id = ${t.id}`;
      }
      for (const p of t.players) {
        await tx`update players set name = ${p.name.trim()},
                 phone = ${p.phone?.trim() || null} where id = ${p.id}`;
      }
    }
  });
}

export async function addSub(name: string, phone: string | null): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  const [{ nextid, nextsort }] = await sql<{ nextid: number; nextsort: number }[]>`
    select coalesce(max(id), 0) + 1 as nextid,
           coalesce(max(sort), -1) + 1 as nextsort from subs`;
  await sql`insert into subs (id, name, phone, sort)
            values (${nextid}, ${name.trim()}, ${phone?.trim() || null}, ${nextsort})`;
}

export async function updateSub(
  id: number,
  name: string,
  phone: string | null,
): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  await sql`update subs set name = ${name.trim()}, phone = ${phone?.trim() || null}
            where id = ${id}`;
}

export async function removeSub(id: number): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  await sql`delete from subs where id = ${id}`;
}

// ---------------------------------------------------------------------------
// Schedule (read + edit)
// ---------------------------------------------------------------------------

export type ScheduleRow = {
  id: number;
  date: string | null;
  label: string;
  note: string | null;
  matchups: string[];
  sort: number;
};

export async function getSchedule(): Promise<ScheduleRow[]> {
  const sql = getSql();
  if (!sql) {
    return SCHEDULE.map((w, i) => ({
      id: i + 1,
      date: w.date,
      label: w.label,
      note: w.note ?? null,
      matchups: w.matchups ?? [],
      sort: i,
    }));
  }
  try {
    await ensureSchema();
    const rows = await sql<
      {
        id: number;
        date: string | null;
        label: string;
        note: string | null;
        matchups: string[] | null;
        sort: number;
      }[]
    >`
      select id, play_date::text as date, label, note, matchups, sort
      from weeks order by sort asc, id asc`;
    return rows.map((r) => ({ ...r, matchups: r.matchups ?? [] }));
  } catch (e) {
    console.error("getSchedule failed, using code schedule:", e);
    return SCHEDULE.map((w, i) => ({
      id: i + 1,
      date: w.date,
      label: w.label,
      note: w.note ?? null,
      matchups: w.matchups ?? [],
      sort: i,
    }));
  }
}

export async function saveWeek(
  id: number,
  data: { date: string | null; label: string; note: string | null; matchups: string[] },
): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  await sql`
    update weeks set play_date = ${data.date}, label = ${data.label},
      note = ${data.note}, matchups = ${data.matchups}
    where id = ${id}`;
}

export async function addWeek(): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  const [{ nextid, nextsort }] = await sql<{ nextid: number; nextsort: number }[]>`
    select coalesce(max(id), 0) + 1 as nextid,
           coalesce(max(sort), -1) + 1 as nextsort from weeks`;
  await sql`insert into weeks (id, label, sort, entry_open, matchups)
            values (${nextid}, ${"New week"}, ${nextsort}, true, ${[] as string[]})`;
}

export async function removeWeek(id: number): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  await sql`delete from weeks where id = ${id}`;
}

/** Circle-method round robin over the current teams, filling every playing week
 *  (a week with no note) with pairings and cycling if there are more weeks than
 *  rounds. A starting point the secretary can then tweak. */
export async function generateRoundRobin(): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  const roster = await getRoster();
  const ids = roster.teams.map((t) => t.id).sort((a, b) => a - b);
  const arr: number[] = [...ids];
  if (arr.length % 2 === 1) arr.push(-1); // odd → bye
  const n = arr.length;
  const rounds: string[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: string[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== -1 && b !== -1) pairs.push(`${a} v ${b}`);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop() as number); // rotate, first fixed
  }
  const weeks = await sql<{ id: number }[]>`
    select id from weeks where note is null order by sort asc, id asc`;
  await sql.begin(async (tx) => {
    for (let i = 0; i < weeks.length; i++) {
      const matchups = rounds.length ? rounds[i % rounds.length] : [];
      await tx`update weeks set matchups = ${matchups} where id = ${weeks[i].id}`;
    }
  });
}

/** Snapshot the full current season into the seasons archive (full fidelity),
 *  so nothing is ever lost on reset. */
export async function archiveCurrentSeason(label: string): Promise<number> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  const [
    teams,
    players,
    weeks,
    results,
    teamResults,
    recaps,
    dues,
    transactions,
    meetings,
    attendance,
    standings,
  ] = await Promise.all([
    sql`select * from teams order by sort, id`,
    sql`select * from players order by team_id, sort`,
    sql`select id, play_date::text as play_date, label, note, sort, matchups from weeks order by sort`,
    sql`select * from results`,
    sql`select * from team_results`,
    sql`select * from recaps`,
    sql`select player_id, paid, amount, paid_on::text as paid_on from dues`,
    sql`select id, occurred_on::text as occurred_on, description, amount, kind from transactions`,
    sql`select id, meeting_date::text as meeting_date, title, notes from meetings order by meeting_date`,
    sql`select * from meeting_attendance`,
    getTeamStandings(),
  ]);
  const champion = standings[0]?.name ?? null;
  const data = {
    teams,
    players,
    weeks,
    results,
    teamResults,
    recaps,
    dues,
    transactions,
    meetings,
    attendance,
    standings,
  };
  const [row] = await sql<{ id: number }[]>`
    insert into seasons (label, champion, data)
    values (${label}, ${champion}, ${sql.json(data)})
    returning id`;
  return row.id;
}

/** Start a new season: archive everything first, then clear scoring, recaps,
 *  dues, ledger and minutes. The roster and schedule are kept for the year
 *  ahead. */
export async function startNewSeason(label: string): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  await archiveCurrentSeason(label);
  await sql.begin(async (tx) => {
    await tx`delete from results`;
    await tx`delete from team_results`;
    await tx`delete from recaps`;
    await tx`delete from dues`;
    await tx`delete from transactions`;
    await tx`delete from meetings`; // attendance cascades
  });
}

export type ArchivedSeason = {
  id: number;
  label: string;
  archivedOn: string;
  champion: string | null;
  standings: { id: number; name: string; points: number; place: number }[];
};

export async function getArchivedSeasons(): Promise<ArchivedSeason[]> {
  noStore();
  const sql = getSql();
  if (!sql) return [];
  await ensureSchema();
  const rows = await sql<
    { id: number; label: string; archived_on: string; champion: string | null; data: { standings?: ArchivedSeason["standings"] } }[]
  >`select id, label, archived_on::text as archived_on, champion, data
    from seasons order by archived_on desc, id desc`;
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    archivedOn: r.archived_on,
    champion: r.champion,
    standings: r.data?.standings ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Meeting minutes & attendance
// ---------------------------------------------------------------------------

export type MeetingSummary = {
  id: number;
  date: string | null;
  title: string;
  notes: string | null;
  present: number;
};

export async function getMeetings(): Promise<MeetingSummary[]> {
  noStore();
  const sql = getSql();
  if (!sql) return [];
  await ensureSchema();
  const rows = await sql<
    { id: number; date: string | null; title: string; notes: string | null; present: number }[]
  >`
    select m.id, m.meeting_date::text as date, m.title, m.notes,
           (select count(*)::int from meeting_attendance a where a.meeting_id = m.id) as present
    from meetings m
    order by m.meeting_date desc nulls last, m.id desc`;
  return rows;
}

export type MeetingDetail = MeetingSummary & {
  attendeeIds: number[];
  roster: RosterTeam[];
  memberCount: number;
};

export async function getMeeting(id: number): Promise<MeetingDetail | null> {
  noStore();
  const sql = getSql();
  if (!sql) return null;
  await ensureSchema();
  const rows = await sql<
    { id: number; date: string | null; title: string; notes: string | null }[]
  >`select id, meeting_date::text as date, title, notes from meetings where id = ${id}`;
  if (rows.length === 0) return null;
  const attendees = await sql<{ player_id: number }[]>`
    select player_id from meeting_attendance where meeting_id = ${id}`;
  const roster = await getRoster();
  const memberCount = roster.teams.reduce((n, t) => n + t.players.length, 0);
  return {
    ...rows[0],
    present: attendees.length,
    attendeeIds: attendees.map((a) => a.player_id),
    roster: roster.teams,
    memberCount,
  };
}

export async function addMeeting(): Promise<number> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  const [row] = await sql<{ id: number }[]>`
    insert into meetings (meeting_date, title) values (current_date, 'League meeting')
    returning id`;
  return row.id;
}

export async function saveMeeting(
  id: number,
  data: { date: string | null; title: string; notes: string | null; attendeeIds: number[] },
): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  await sql.begin(async (tx) => {
    await tx`update meetings set meeting_date = ${data.date},
             title = ${data.title || "League meeting"}, notes = ${data.notes}
             where id = ${id}`;
    await tx`delete from meeting_attendance where meeting_id = ${id}`;
    for (const pid of data.attendeeIds) {
      await tx`insert into meeting_attendance (meeting_id, player_id)
               values (${id}, ${pid}) on conflict do nothing`;
    }
  });
}

export async function deleteMeeting(id: number): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  await sql`delete from meetings where id = ${id}`;
}

// ---------------------------------------------------------------------------
// Treasury (dues + ledger)
// ---------------------------------------------------------------------------

export type DuesRow = {
  playerId: number;
  name: string;
  teamName: string;
  paid: boolean;
  amount: number;
  paidOn: string | null;
};
export type Txn = {
  id: number;
  occurredOn: string;
  description: string;
  amount: number;
  kind: string;
};
export type Treasury = {
  dues: DuesRow[];
  transactions: Txn[];
  duesCollected: number;
  duesOutstanding: number;
  otherIncome: number;
  expenses: number;
  balance: number;
  memberFee: number;
};

const MEMBER_FEE = 50;

export async function getTreasury(): Promise<Treasury | null> {
  noStore();
  const sql = getSql();
  if (!sql) return null;
  await ensureSchema();
  const dues = await sql<
    {
      playerId: number;
      name: string;
      teamName: string;
      paid: boolean;
      amount: number;
      paidOn: string | null;
    }[]
  >`
    select p.id as "playerId", p.name, t.name as "teamName",
           coalesce(d.paid, false) as paid,
           coalesce(d.amount, ${MEMBER_FEE})::float8 as amount,
           d.paid_on::text as "paidOn"
    from players p
    join teams t on t.id = p.team_id
    left join dues d on d.player_id = p.id
    order by t.sort asc, p.sort asc`;
  const txns = await sql<Txn[]>`
    select id, occurred_on::text as "occurredOn", description, amount::float8 as amount, kind
    from transactions order by occurred_on desc, id desc`;

  const duesCollected = dues.filter((d) => d.paid).reduce((s, d) => s + d.amount, 0);
  const duesOutstanding = dues.filter((d) => !d.paid).reduce((s, d) => s + d.amount, 0);
  const otherIncome = txns.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = txns.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);

  return {
    dues,
    transactions: txns,
    duesCollected,
    duesOutstanding,
    otherIncome,
    expenses,
    balance: duesCollected + otherIncome - expenses,
    memberFee: MEMBER_FEE,
  };
}

export async function setDuesPaid(playerId: number, paid: boolean): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  await sql`
    insert into dues (player_id, paid, amount, paid_on)
    values (${playerId}, ${paid}, ${MEMBER_FEE}, ${paid ? new Date().toISOString().slice(0, 10) : null})
    on conflict (player_id) do update
      set paid = excluded.paid, paid_on = excluded.paid_on`;
}

export async function addTransaction(
  occurredOn: string,
  description: string,
  amount: number,
  kind: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  await sql`
    insert into transactions (occurred_on, description, amount, kind)
    values (${occurredOn || new Date().toISOString().slice(0, 10)},
            ${description}, ${Math.abs(amount)}, ${kind})`;
}

export async function removeTransaction(id: number): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  await sql`delete from transactions where id = ${id}`;
}
