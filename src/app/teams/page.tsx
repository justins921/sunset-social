import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { LEAGUE } from "@/data/league";
import { ordinal } from "@/lib/standings";
import { getTeamStandings, getIndividualStandings, getRoster, getSeasonMeta } from "@/lib/queries";

export const metadata: Metadata = { title: "Teams" };
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const [ranked, individuals, roster, meta] = await Promise.all([
    getTeamStandings(),
    getIndividualStandings(),
    getRoster(),
    getSeasonMeta(),
  ]);
  const placeById = new Map(ranked.map((t) => [t.id, t.place]));
  const pointsById = new Map(ranked.map((t) => [t.id, t.points]));
  const playerPoints = new Map(
    individuals.map((p) => [`${p.teamId}-${p.name}`, p.points ?? 0]),
  );
  const playerHcp = new Map(
    individuals.map((p) => [`${p.teamId}-${p.name}`, p.handicap]),
  );
  // Display teams in numeric order for easy roster lookup.
  const teams = [...roster.teams].sort((a, b) => a.id - b.id);
  const SUBS = roster.subs;

  return (
    <div>
      <PageHeader
        eyebrow={meta.complete ? `Final ${LEAGUE.season} rosters · ${meta.asOf}` : `Rosters as of ${meta.asOf}`}
        title="Teams"
        subtitle={`${teams.length} teams of four. Each golfer plays a head-to-head match every week.`}
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {teams.map((t) => (
            <div
              key={t.id}
              id={`team-${t.id}`}
              className="scroll-mt-20 rounded-2xl border border-white/10 bg-dusk-800/40 p-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{t.name}</h2>
                <div className="flex items-center gap-3 text-sm">
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-slate-400">
                    {placeById.get(t.id) ? `${ordinal(placeById.get(t.id)!)} place` : ""}
                  </span>
                  <span className="font-mono font-semibold text-sunset-200">
                    {(pointsById.get(t.id) ?? 0).toFixed(1)} pts
                  </span>
                </div>
              </div>
              <ul className="mt-4 divide-y divide-white/5">
                {t.players.map((p) => (
                  <li key={p.name} className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/5 font-mono text-xs text-slate-400">
                        {p.slot}
                      </span>
                      <span className="font-medium">{p.name}</span>
                    </span>
                    <span className="flex items-center gap-4">
                      {p.phone && (
                        <a
                          href={`tel:${p.phone.replace(/\./g, "")}`}
                          className="text-xs text-slate-400 hover:text-sunset-300"
                        >
                          {p.phone}
                        </a>
                      )}
                      <span className="hidden text-xs text-slate-500 sm:inline">
                        Hcp {playerHcp.get(`${t.id}-${p.name}`) ?? "—"}
                      </span>
                      <span className="font-mono text-sm text-slate-300">
                        {(playerPoints.get(`${t.id}-${p.name}`) ?? 0).toFixed(1)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Subs */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Substitutes</h2>
          <p className="mt-1 text-sm text-slate-400">
            Call ahead if you need someone to fill in for your match.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {SUBS.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-dusk-800/40 px-4 py-2.5"
              >
                <span className="font-medium">{s.name}</span>
                {s.phone && (
                  <a
                    href={`tel:${s.phone.replace(/\./g, "")}`}
                    className="text-xs text-slate-400 hover:text-sunset-300"
                  >
                    {s.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 text-xs text-slate-500">
          See the{" "}
          <Link href="/standings" className="text-sunset-300 hover:underline">
            standings
          </Link>{" "}
          for current placement. Points and handicaps update as scores are posted.
        </p>
      </div>
    </div>
  );
}
