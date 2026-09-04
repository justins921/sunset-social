import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { getSql, ensureSchema, playerId } from "@/lib/db";
import {
  teamStandings as staticTeamStandings,
  individualStandings as staticIndividualStandings,
  type RankedTeam,
  type RankedPlayer,
} from "@/lib/standings";
import { LEAGUE, TEAMS, SCHEDULE, RECAPS, type Player } from "@/data/league";
import { SEASON_2026 } from "@/data/season2026";
import {
  BANQUET_2026,
  type BanquetData,
  type BanquetAwards,
  type MvpEntry,
  type PlaceEntry,
  type ImprovedEntry,
} from "@/data/banquet2026";

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
  // Only real rounds count. A missed week is stored as strokes = 0, which is not
  // a 9-hole score; including it would drag a golfer's average (and handicap)
  // down to a bogus 0, so exclude non-positive strokes.
  const rows = await sql<{ player_id: number; strokes: number }[]>`
    select r.player_id, r.strokes
    from results r
    join weeks w on w.id = r.week_id
    where r.strokes is not null and r.strokes > 0
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

// ---------------------------------------------------------------------------
// Season meta — the public "as of" date derived from the last week that has
// scores, whether the season looks complete, and the most recent recap. This
// replaces the hardcoded LEAGUE.standingsAsOf so the site rolls forward on its
// own as nights are entered.
// ---------------------------------------------------------------------------

export type SeasonMeta = {
  asOfISO: string | null;
  /** Formatted last-scored date, e.g. "August 20, 2026". */
  asOf: string;
  /** No scheduled match-play week remains after the last scored week. */
  complete: boolean;
  lastRecap: {
    label: string;
    lowScores: string | null;
    fiftyFifty: string | null;
  } | null;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
function formatISODate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export async function getSeasonMeta(): Promise<SeasonMeta> {
  noStore();
  const fallbackRecap = RECAPS.length
    ? {
        label: RECAPS[RECAPS.length - 1].label,
        lowScores: RECAPS[RECAPS.length - 1].lowScores ?? null,
        fiftyFifty: RECAPS[RECAPS.length - 1].fiftyFifty ?? null,
      }
    : null;
  const sql = getSql();
  if (!sql) {
    return { asOfISO: null, asOf: LEAGUE.standingsAsOf, complete: false, lastRecap: fallbackRecap };
  }
  try {
    await ensureSchema();
    const weeks = await sql<
      { label: string; play_date: string | null; low_scores: string | null; fifty_fifty: string | null }[]
    >`
      select w.label, w.play_date::text as play_date, rc.low_scores, rc.fifty_fifty
      from weeks w
      left join recaps rc on rc.week_id = w.id
      where exists (select 1 from results r where r.week_id = w.id)
      order by w.sort desc`;
    const last = weeks[0] ?? null;
    const asOfISO = last?.play_date ?? null;
    const recapRow =
      weeks.find((w) => (w.low_scores && w.low_scores.trim()) || (w.fifty_fifty && w.fifty_fifty.trim())) ?? null;
    const complete = asOfISO
      ? !SCHEDULE.some((w) => (w.matchups?.length ?? 0) > 0 && w.date > asOfISO)
      : false;
    return {
      asOfISO,
      asOf: formatISODate(asOfISO) ?? LEAGUE.standingsAsOf,
      complete,
      lastRecap: recapRow
        ? { label: recapRow.label, lowScores: recapRow.low_scores, fiftyFifty: recapRow.fifty_fifty }
        : fallbackRecap,
    };
  } catch (e) {
    console.error("getSeasonMeta failed:", e);
    return { asOfISO: null, asOf: LEAGUE.standingsAsOf, complete: false, lastRecap: fallbackRecap };
  }
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
    meetings,
    attendance,
    finIncome,
    finExpense,
    finExpenseItems,
    finFifty,
    standings,
    banquetRows,
  ] = await Promise.all([
    sql`select * from teams order by sort, id`,
    sql`select * from players order by team_id, sort`,
    sql`select id, play_date::text as play_date, label, note, sort, matchups from weeks order by sort`,
    sql`select * from results`,
    sql`select * from team_results`,
    sql`select * from recaps`,
    sql`select id, meeting_date::text as meeting_date, title, notes from meetings order by meeting_date`,
    sql`select * from meeting_attendance`,
    sql`select id, occurred_on::text as occurred_on, description, amount, category from fin_income order by id`,
    sql`select id, occurred_on::text as occurred_on, description, amount, check_no from fin_expense order by id`,
    sql`select id, expense_id, description, amount, sort from fin_expense_item order by expense_id, sort, id`,
    sql`select id, occurred_on::text as occurred_on, winner, amount, kind from fin_5050 order by id`,
    getTeamStandings(),
    sql`select season, data from banquet order by season`,
  ]);
  const champion = standings[0]?.name ?? null;
  const data = {
    teams,
    players,
    weeks,
    results,
    teamResults,
    recaps,
    meetings,
    attendance,
    finIncome,
    finExpense,
    finExpenseItems,
    finFifty,
    standings,
    banquet: banquetRows,
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
  const [banquet] = await sql<{ season: number; data: BanquetData }[]>`
    select season, data from banquet order by season desc limit 1`;
  await sql.begin(async (tx) => {
    await tx`delete from results`;
    await tx`delete from team_results`;
    await tx`delete from recaps`;
    await tx`delete from meetings`; // attendance cascades
    await tx`delete from fin_income`;
    await tx`delete from fin_expense`;
    await tx`delete from fin_5050`;
    await tx`delete from dues`;
    await tx`delete from transactions`;
    // Roll the banquet script forward: keep the door-prize template, officers
    // and boilerplate; bump the year and clear this season's winners so next
    // year starts from a clean sheet.
    if (banquet) {
      const next = rollBanquet(banquet.data);
      await tx`delete from banquet`;
      await tx`insert into banquet (season, data) values (${next.year}, ${tx.json(next)})`;
    }
  });
}

function rollBanquet(d: BanquetData): BanquetData {
  const year = (Number(d.year) || new Date().getFullYear()) + 1;
  return {
    ...d,
    year,
    electionSeason: String(year + 1),
    doorPrizes: d.doorPrizes.map((p) => ({ ...p, winners: p.winners.map(() => "") })),
    flightNight: d.flightNight.map((f) => ({ ...f, name: "", net: "" })),
    holeEvents: d.holeEvents.map((h) => ({ ...h, winner: "" })),
    fiftyFiftyAmount: "",
    fiftyFiftyWinner: "",
    awardsOverride: null,
  };
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

// ---------------------------------------------------------------------------
// Financial report (treasurer's balance sheet)
// ---------------------------------------------------------------------------

export type FinIncomeRow = {
  id: number;
  date: string | null;
  description: string;
  amount: number;
  category: string | null;
};
export type FinExpenseItemRow = { id: number; description: string; amount: number };
export type FinExpenseRow = {
  id: number;
  date: string | null;
  description: string;
  amount: number;
  checkNo: string | null;
  items: FinExpenseItemRow[];
};
export type FinFiftyRow = {
  id: number;
  date: string | null;
  winner: string | null;
  amount: number;
  kind: string;
};

// The drawings run each week. "50/50" is the weekly pot; Fun Night rounds add a
// $100 and a $50 drawing. Each is tracked independently so the money brought in
// per drawing is visible.
export const DRAWING_KINDS = [
  { value: "50/50", label: "50/50" },
  { value: "fnr100", label: "Fun Night $100" },
  { value: "fnr50", label: "Fun Night $50" },
] as const;
export const drawingLabel = (kind: string) =>
  DRAWING_KINDS.find((k) => k.value === kind)?.label ?? kind;

export type Financials = {
  income: FinIncomeRow[];
  expenses: FinExpenseRow[];
  fifty: FinFiftyRow[];
  fiftyTotal: number;
  /** Money brought in per drawing kind, e.g. 50/50 vs the Fun Night drawings. */
  drawingTotals: { kind: string; label: string; total: number }[];
  incomeTotal: number;
  grandTotal: number;
  debitTotal: number;
  moneyOnHand: number;
  officers: { name: string; title: string }[];
};

export async function getFinancials(): Promise<Financials | null> {
  noStore();
  const sql = getSql();
  if (!sql) return null;
  await ensureSchema();
  const [income, expenseRows, items, fifty, meta] = await Promise.all([
    sql<FinIncomeRow[]>`
      select id, occurred_on::text as date, description, amount::float8 as amount, category
      from fin_income order by occurred_on asc nulls last, id asc`,
    sql<Omit<FinExpenseRow, "items">[]>`
      select id, occurred_on::text as date, description, amount::float8 as amount, check_no as "checkNo"
      from fin_expense order by occurred_on asc nulls last, id asc`,
    sql<{ id: number; expenseId: number; description: string; amount: number }[]>`
      select id, expense_id as "expenseId", description, amount::float8 as amount
      from fin_expense_item order by expense_id asc, sort asc, id asc`,
    sql<FinFiftyRow[]>`
      select id, occurred_on::text as date, winner, amount::float8 as amount, kind
      from fin_5050 order by occurred_on asc nulls last, id asc`,
    sql<{ key: string; value: string }[]>`
      select key, value from app_meta where key like 'officer%\_name' escape '\'
         or key like 'officer%\_title' escape '\'`,
  ]);
  const itemsByExpense = new Map<number, FinExpenseItemRow[]>();
  for (const it of items) {
    const list = itemsByExpense.get(it.expenseId) ?? [];
    list.push({ id: it.id, description: it.description, amount: it.amount });
    itemsByExpense.set(it.expenseId, list);
  }
  const expenses: FinExpenseRow[] = expenseRows.map((e) => ({
    ...e,
    items: itemsByExpense.get(e.id) ?? [],
  }));
  const m = new Map(meta.map((r) => [r.key, r.value]));
  const fiftyTotal = fifty.reduce((s, r) => s + r.amount, 0);
  const drawingTotals = DRAWING_KINDS.map((k) => ({
    kind: k.value,
    label: k.label,
    total: fifty.filter((r) => (r.kind || "50/50") === k.value).reduce((s, r) => s + r.amount, 0),
  })).filter((d) => d.total > 0);
  const incomeTotal = income.reduce((s, r) => s + r.amount, 0);
  const debitTotal = expenses.reduce((s, r) => s + r.amount, 0);
  const grandTotal = incomeTotal + fiftyTotal;
  return {
    income,
    expenses,
    fifty,
    fiftyTotal,
    drawingTotals,
    incomeTotal,
    grandTotal,
    debitTotal,
    moneyOnHand: grandTotal - debitTotal,
    officers: [1, 2, 3].map((i) => ({
      name: m.get(`officer${i}_name`) ?? "",
      title: m.get(`officer${i}_title`) ?? "",
    })),
  };
}

async function requireSql(): Promise<Sql> {
  const sql = getSql();
  if (!sql) throw new Error("No database configured");
  await ensureSchema();
  return sql;
}

export async function addIncome(date: string | null, description: string, amount: number, category: string) {
  const sql = await requireSql();
  await sql`insert into fin_income (occurred_on, description, amount, category)
            values (${date}, ${description}, ${amount}, ${category})`;
}
export async function addExpense(date: string | null, description: string, amount: number, checkNo: string | null) {
  const sql = await requireSql();
  await sql`insert into fin_expense (occurred_on, description, amount, check_no)
            values (${date}, ${description}, ${amount}, ${checkNo})`;
}
export async function addExpenseItem(expenseId: number, description: string, amount: number) {
  const sql = await requireSql();
  const [{ next }] = await sql<{ next: number }[]>`
    select coalesce(max(sort) + 1, 0)::int as next from fin_expense_item where expense_id = ${expenseId}`;
  await sql`insert into fin_expense_item (expense_id, description, amount, sort)
            values (${expenseId}, ${description}, ${amount}, ${next})`;
}
export async function removeExpenseItem(id: number) {
  const sql = await requireSql();
  await sql`delete from fin_expense_item where id = ${id}`;
}
export async function addFifty(date: string | null, winner: string, amount: number, kind: string) {
  const sql = await requireSql();
  await sql`insert into fin_5050 (occurred_on, winner, amount, kind)
            values (${date}, ${winner}, ${amount}, ${kind})`;
}
export async function removeFin(table: "income" | "expense" | "fifty", id: number) {
  const sql = await requireSql();
  if (table === "income") await sql`delete from fin_income where id = ${id}`;
  else if (table === "expense") await sql`delete from fin_expense where id = ${id}`;
  else await sql`delete from fin_5050 where id = ${id}`;
}
export async function setOfficers(officers: { name: string; title: string }[]) {
  const sql = await requireSql();
  for (let i = 0; i < 3; i++) {
    const o = officers[i] ?? { name: "", title: "" };
    for (const [k, v] of [
      [`officer${i + 1}_name`, o.name],
      [`officer${i + 1}_title`, o.title],
    ] as const) {
      await sql`insert into app_meta (key, value) values (${k}, ${v})
                on conflict (key) do update set value = excluded.value`;
    }
  }
}

// ---------------------------------------------------------------------------
// Banquet (year-end run-of-show + awards)
// ---------------------------------------------------------------------------

export type Banquet = {
  data: BanquetData;
  /** Awards computed live from the standings. */
  computed: BanquetAwards;
  /** What the booklet prints: the manual override when set, else `computed`. */
  awards: BanquetAwards;
};

/** Compute the award winners from the season standings: League MVP(s) (top
 *  individual point total, including ties), each team's MVP (its top player),
 *  the top-three place teams, and Most Improved (largest drop between a
 *  golfer's first-half and second-half scoring average). */
export async function getBanquetAwards(): Promise<BanquetAwards> {
  noStore();
  const [teams, players] = await Promise.all([
    getTeamStandings(),
    getIndividualStandings(),
  ]);

  // League MVP(s): everyone tied at the highest point total.
  const top = players[0]?.points ?? 0;
  const leagueMvps: MvpEntry[] =
    top > 0
      ? players
          .filter((p) => (p.points ?? 0) === top)
          .map((p) => ({
            teamId: p.teamId,
            teamName: p.teamName,
            name: p.name,
            points: p.points ?? 0,
          }))
      : [];
  const mvpNames = new Set(leagueMvps.map((m) => `${m.teamId}:${m.name}`));

  // Each team's MVP: its highest-scoring player. Teams whose top player is a
  // league MVP are omitted, matching how the award is read at the banquet.
  const bestByTeam = new Map<number, MvpEntry>();
  for (const p of players) {
    const pts = p.points ?? 0;
    const cur = bestByTeam.get(p.teamId);
    if (!cur || pts > cur.points)
      bestByTeam.set(p.teamId, {
        teamId: p.teamId,
        teamName: p.teamName,
        name: p.name,
        points: pts,
      });
  }
  const teamMvps: MvpEntry[] = [...bestByTeam.values()]
    .filter((m) => m.points > 0 && !mvpNames.has(`${m.teamId}:${m.name}`))
    .sort((a, b) => a.teamId - b.teamId);

  // Place winners: the top three teams by points.
  const placeWinners: PlaceEntry[] = teams.slice(0, 3).map((t, i) => ({
    place: i + 1,
    teamId: t.id,
    teamName: t.name,
    points: t.points,
    players: t.players.map((p) => p.name),
  }));

  const mostImproved = await computeMostImproved();
  return { leagueMvps, teamMvps, placeWinners, mostImproved };
}

async function computeMostImproved(): Promise<ImprovedEntry | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql<{ player_id: number; strokes: number; sort: number }[]>`
    select r.player_id, r.strokes, w.sort
    from results r join weeks w on w.id = r.week_id
    where r.strokes is not null
    order by w.sort asc`;
  if (rows.length === 0) return null;
  const byPlayer = new Map<number, number[]>();
  for (const r of rows) {
    const list = byPlayer.get(r.player_id) ?? [];
    list.push(r.strokes);
    byPlayer.set(r.player_id, list);
  }
  const roster = await getRoster();
  const nameOf = new Map<number, { name: string; teamId: number; teamName: string }>();
  for (const t of roster.teams)
    for (const p of t.players)
      nameOf.set(p.id, { name: p.name, teamId: t.id, teamName: t.name });

  let best: ImprovedEntry | null = null;
  for (const [pid, scores] of byPlayer) {
    // Need enough rounds to split into two halves.
    if (scores.length < 4) continue;
    const mid = Math.floor(scores.length / 2);
    const first = scores.slice(0, mid);
    const second = scores.slice(mid);
    const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
    const firstAvg = Math.round(avg(first) * 10) / 10;
    const secondAvg = Math.round(avg(second) * 10) / 10;
    const improvement = firstAvg - secondAvg;
    const who = nameOf.get(pid);
    if (!who) continue;
    if (improvement > 0 && (!best || improvement > best.firstAvg - best.secondAvg))
      best = { teamId: who.teamId, teamName: who.teamName, name: who.name, firstAvg, secondAvg };
  }
  return best;
}

export async function getBanquet(): Promise<Banquet> {
  noStore();
  const sql = getSql();
  const computed = await getBanquetAwards();
  if (!sql) {
    const data = BANQUET_2026;
    return { data, computed, awards: data.awardsOverride ?? computed };
  }
  await ensureSchema();
  const [row] = await sql<{ data: BanquetData }[]>`
    select data from banquet order by season desc limit 1`;
  const data = row?.data ?? BANQUET_2026;
  return { data, computed, awards: data.awardsOverride ?? computed };
}

export async function saveBanquet(data: BanquetData): Promise<void> {
  const sql = await requireSql();
  await sql`insert into banquet (season, data, updated_at)
            values (${data.year}, ${sql.json(data)}, now())
            on conflict (season) do update
              set data = excluded.data, updated_at = now()`;
}

// ---------------------------------------------------------------------------
// Draft board — ranks all rostered golfers to seed balanced teams for the next
// season. Sort: scoring average (low), then handicap (low), then points per
// week (high), then games played (high), then best single round (low). Anything
// still tied is flagged, never silently alphabetized. Uses per-round rates so a
// golfer who missed weeks is compared fairly. Read the current season's scores
// before archiving, since the draft happens on last year's numbers.
// ---------------------------------------------------------------------------

export type DraftPlayer = {
  playerId: number;
  lastTeamId: number;
  name: string;
  games: number;
  scoringAvg: number | null;
  handicap: number | null;
  pointsPerWeek: number | null;
  bestRound: number | null;
  rank: number;
  ranked: boolean; // false = no prior scores, placed at the bottom for manual seeding
  tiedWithPrev: boolean;
  tiedWithNext: boolean;
  draftTeam: number; // suggested serpentine team slot
  draftRound: number;
};

export async function getDraftBoard(): Promise<{ players: DraftPlayer[]; numTeams: number }> {
  noStore();
  const roster = await getRoster();
  const numTeams = roster.teams.length || 10;
  const sql = getSql();
  if (!sql) return { players: [], numTeams };
  await ensureSchema();
  const rows = await sql<
    { player_id: number; games: number; scoring_avg: number | null; best_round: number | null; pts_total: number; pts_weeks: number }[]
  >`
    select r.player_id,
      count(*) filter (where r.strokes > 0)::int as games,
      avg(r.strokes) filter (where r.strokes > 0)::float8 as scoring_avg,
      min(r.strokes) filter (where r.strokes > 0)::int as best_round,
      coalesce(sum(r.points), 0)::float8 as pts_total,
      count(*) filter (where r.points is not null)::int as pts_weeks
    from results r group by r.player_id`;
  const stat = new Map(rows.map((r) => [r.player_id, r]));
  const hcp = await getHandicaps();

  type Row = Omit<DraftPlayer, "rank" | "ranked" | "tiedWithPrev" | "tiedWithNext" | "draftTeam" | "draftRound">;
  const flat: Row[] = roster.teams.flatMap((t) =>
    t.players.map((p) => {
      const s = stat.get(p.id);
      const games = s ? s.games : 0;
      const ptsWeeks = s ? s.pts_weeks : 0;
      const round2 = (n: number) => Math.round(n * 100) / 100;
      return {
        playerId: p.id,
        lastTeamId: t.id,
        name: p.name,
        games,
        scoringAvg: s && s.scoring_avg != null ? round2(s.scoring_avg) : null,
        handicap: hcp.get(p.id) ?? null,
        pointsPerWeek: s && ptsWeeks > 0 ? round2(s.pts_total / ptsWeeks) : null,
        bestRound: s && s.best_round != null ? s.best_round : null,
      };
    }),
  );

  const cmp = (a: Row, b: Row) => {
    const av = a.scoringAvg ?? Infinity, bv = b.scoringAvg ?? Infinity;
    if (av !== bv) return av - bv;
    const ah = a.handicap ?? Infinity, bh = b.handicap ?? Infinity;
    if (ah !== bh) return ah - bh;
    const ap = a.pointsPerWeek ?? -Infinity, bp = b.pointsPerWeek ?? -Infinity;
    if (ap !== bp) return bp - ap;
    if (a.games !== b.games) return b.games - a.games;
    const ab = a.bestRound ?? Infinity, bb = b.bestRound ?? Infinity;
    if (ab !== bb) return ab - bb;
    return 0;
  };
  const sameKey = (a: Row, b: Row) =>
    a.scoringAvg === b.scoringAvg &&
    a.handicap === b.handicap &&
    a.pointsPerWeek === b.pointsPerWeek &&
    a.games === b.games &&
    a.bestRound === b.bestRound;

  const ranked = flat.filter((p) => p.scoringAvg != null).sort(cmp);
  const unranked = flat.filter((p) => p.scoringAvg == null);
  const ordered = [...ranked, ...unranked];

  return {
    numTeams,
    players: ordered.map((p, i) => {
      const round = Math.floor(i / numTeams);
      const pos = i % numTeams;
      const isRanked = p.scoringAvg != null;
      return {
        ...p,
        rank: i + 1,
        ranked: isRanked,
        tiedWithPrev: isRanked && i > 0 && ranked[i - 1] != null && sameKey(p, ordered[i - 1]),
        tiedWithNext: isRanked && i < ranked.length - 1 && sameKey(p, ordered[i + 1]),
        draftTeam: round % 2 === 0 ? pos + 1 : numTeams - pos, // serpentine
        draftRound: round + 1,
      };
    }),
  };
}
