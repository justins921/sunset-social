import Link from "next/link";
import { LEAGUE, SCHEDULE, RECAPS } from "@/data/league";
import { getTeamStandings, getIndividualStandings, getRoster } from "@/lib/queries";

export const dynamic = "force-dynamic";

function nextWeek() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = SCHEDULE.find((w) => new Date(w.date + "T00:00:00") >= today);
  return upcoming ?? SCHEDULE[SCHEDULE.length - 1];
}

export default async function HomePage() {
  const [teams, topAll, roster] = await Promise.all([
    getTeamStandings(),
    getIndividualStandings(),
    getRoster(),
  ]);
  const leader = teams[0];
  const topPlayers = topAll.slice(0, 5);
  const week = nextWeek();
  const latestRecap = RECAPS[RECAPS.length - 1];
  const playerCount = roster.teams.reduce((n, t) => n + t.players.length, 0);
  const SUBS = roster.subs;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-sunset-sky" aria-hidden />
        <div className="absolute inset-0 bg-dusk-950/40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sunset-100/90">
            {LEAGUE.course} · Est. league play
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            {LEAGUE.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-sunset-50/90">
            {LEAGUE.season} season · {teams.length} teams · {playerCount} golfers ·
            9-hole match play every {LEAGUE.playDay}, {LEAGUE.teeTimes}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/standings"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-dusk-900 shadow transition hover:bg-sunset-50"
            >
              View standings
            </Link>
            <Link
              href="/schedule"
              className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              See the schedule
            </Link>
          </div>
        </div>
      </section>

      {/* Quick facts */}
      <section className="mx-auto -mt-8 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-dusk-800/60 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Current leader
            </p>
            <p className="mt-1 text-xl font-semibold text-white">{leader.name}</p>
            <p className="text-sunset-300">{leader.points.toFixed(1)} pts</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-dusk-800/60 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Next on the tee
            </p>
            <p className="mt-1 text-xl font-semibold text-white">{week.label}</p>
            <p className="text-slate-300">{week.note ?? "League match play"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-dusk-800/60 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Standings as of
            </p>
            <p className="mt-1 text-xl font-semibold text-white">
              {LEAGUE.standingsAsOf}
            </p>
            <p className="text-slate-300">Updated weekly</p>
          </div>
        </div>
      </section>

      {/* Standings + highlights */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Team standings preview */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Team standings</h2>
              <Link href="/standings" className="text-sm text-sunset-300 hover:underline">
                Full standings →
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3 font-normal">Players</th>
                    <th className="px-4 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {teams.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-mono text-slate-400">{t.place}</td>
                      <td className="px-4 py-3 font-semibold">
                        <Link href={`/teams#team-${t.id}`} className="hover:text-sunset-300">
                          {t.name}
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-400 sm:table-cell">
                        {t.players.map((p) => p.name.split(" ").slice(-1)[0]).join(", ")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-sunset-200">
                        {t.points.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side column */}
          <div className="space-y-8">
            <div>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Points leaders</h2>
                <Link href="/standings#individual" className="text-sm text-sunset-300 hover:underline">
                  All →
                </Link>
              </div>
              <ol className="space-y-2">
                {topPlayers.map((p) => (
                  <li
                    key={`${p.teamId}-${p.name}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-dusk-800/40 px-4 py-2.5"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-5 font-mono text-slate-500">{p.place}</span>
                      <span>
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 text-xs text-slate-500">{p.teamName}</span>
                      </span>
                    </span>
                    <span className="font-mono font-semibold text-sunset-200">
                      {(p.points ?? 0).toFixed(1)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {latestRecap && (
              <div className="rounded-2xl border border-white/10 bg-dusk-800/40 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-sunset-300">
                  Latest recap · {latestRecap.label}
                </h3>
                <dl className="mt-3 space-y-3 text-sm">
                  {latestRecap.lowScores && (
                    <div>
                      <dt className="text-slate-400">Low scores</dt>
                      <dd className="text-slate-100">{latestRecap.lowScores}</dd>
                    </div>
                  )}
                  {latestRecap.fiftyFifty && (
                    <div>
                      <dt className="text-slate-400">50/50 winner</dt>
                      <dd className="text-slate-100">{latestRecap.fiftyFifty}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sub list strip */}
      <section className="border-t border-white/10 bg-dusk-900/40">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="text-lg font-semibold">Substitutes</h2>
          <p className="mt-1 text-sm text-slate-400">
            Need a fill-in? Any of these golfers can sub.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUBS.map((s) => (
              <span
                key={s.name}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200"
              >
                {s.name}
                {s.phone && <span className="ml-2 text-xs text-slate-500">{s.phone}</span>}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
