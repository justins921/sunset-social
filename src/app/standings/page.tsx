import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { LEAGUE } from "@/data/league";
import { teamStandings, individualStandings } from "@/lib/standings";

export const metadata: Metadata = { title: "Standings" };

export default function StandingsPage() {
  const teams = teamStandings();
  const players = individualStandings();
  const maxTeam = teams[0].points;

  return (
    <div>
      <PageHeader
        eyebrow={`As of ${LEAGUE.standingsAsOf}`}
        title="Standings"
        subtitle="Team totals and individual points for the season. All team scores count toward the standings total."
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Team standings */}
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Teams</h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Place</th>
                <th className="px-4 py-3">Team</th>
                <th className="hidden px-4 py-3 md:table-cell">Roster</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {teams.map((t) => (
                <tr key={t.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs ${
                        t.place <= 3
                          ? "bg-sunset-500/25 text-sunset-100"
                          : "text-slate-400"
                      }`}
                    >
                      {t.place}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/teams#team-${t.id}`} className="hover:text-sunset-300">
                      {t.name}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-400 md:table-cell">
                    {t.players.map((p) => p.name).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-white/10 sm:block">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sunset-400 to-sunset-600"
                          style={{ width: `${(t.points / maxTeam) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono font-semibold text-sunset-200">
                        {t.points.toFixed(1)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Individual standings */}
        <h2 id="individual" className="mb-4 mt-12 scroll-mt-20 text-2xl font-bold tracking-tight">
          Individual points
        </h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Golfer</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {players.map((p) => (
                <tr key={`${p.teamId}-${p.name}`} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-slate-500">{p.place}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-400">
                    <Link href={`/teams#team-${p.teamId}`} className="hover:text-sunset-300">
                      {p.teamName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-sunset-200">
                    {(p.points ?? 0).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Points reflect the 10-point match-play system (see the{" "}
          <Link href="/rules" className="text-sunset-300 hover:underline">
            Rules
          </Link>
          ). Standings current as of {LEAGUE.standingsAsOf}.
        </p>
      </div>
    </div>
  );
}
