import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { LEAGUE } from "@/data/league";
import { getTeamStandings, getIndividualStandings, getSeasonMeta } from "@/lib/queries";

export const metadata: Metadata = { title: "Standings" };
export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const [teams, players, meta] = await Promise.all([
    getTeamStandings(),
    getIndividualStandings(),
    getSeasonMeta(),
  ]);
  const maxTeam = teams[0].points;

  return (
    <div>
      <PageHeader
        eyebrow={meta.complete ? `Final ${LEAGUE.season} standings · ${meta.asOf}` : `As of ${meta.asOf}`}
        title="Standings"
        subtitle="Team totals and individual points for the season. All team scores count toward the standings total."
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Team standings */}
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Teams</h2>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wider text-ink2">
              <tr>
                <th className="px-4 py-3">Place</th>
                <th className="px-4 py-3">Team</th>
                <th className="hidden px-4 py-3 md:table-cell">Roster</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {teams.map((t) => (
                <tr key={t.id} className="hover:bg-surface2">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs ${
                        t.place <= 3
                          ? "bg-sunset-500/25 text-accent"
                          : "text-ink2"
                      }`}
                    >
                      {t.place}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/teams#team-${t.id}`} className="hover:text-accent">
                      {t.name}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-ink2 md:table-cell">
                    {t.players.map((p) => p.name).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-surface2 sm:block">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sunset-400 to-sunset-600"
                          style={{ width: `${(t.points / maxTeam) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono font-semibold text-accent">
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
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wider text-ink2">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Golfer</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-right" title="Current handicap (Rule 10, last 4 rounds)">
                  Hcp<span className="font-normal text-ink3">*</span>
                </th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {players.map((p) => (
                <tr key={`${p.teamId}-${p.name}`} className="hover:bg-surface2">
                  <td className="px-4 py-3 font-mono text-ink3">{p.place}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-ink2">
                    <Link href={`/teams#team-${p.teamId}`} className="hover:text-accent">
                      {p.teamName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-ink2">
                    {p.handicap ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-accent">
                    {(p.points ?? 0).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-ink3">
          Points reflect the 10-point match-play system (see the{" "}
          <Link href="/rules" className="text-accent hover:underline">
            Rules
          </Link>
          ). <span className="font-medium">*Hcp</span> is each golfer&apos;s current
          handicap under Rule 10 — the average of their most recent four 9-hole
          rounds minus par 35.{" "}
          {meta.complete
            ? `Final ${LEAGUE.season} standings, season complete ${meta.asOf}.`
            : `Standings current as of ${meta.asOf}.`}
        </p>
      </div>
    </div>
  );
}
