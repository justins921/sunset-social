import { redirect } from "next/navigation";
import Link from "next/link";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getDraftBoard, type DraftPlayer } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Draft board" };

const fmt = (n: number | null, dp = 1) =>
  n === null ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(dp);

export default async function DraftBoard() {
  if (!adminConfigured() || !isAuthed()) redirect("/admin/login");
  if (!hasDb()) redirect("/admin");
  const { players, numTeams } = await getDraftBoard();

  const ranked = players.filter((p) => p.ranked);
  const unranked = players.filter((p) => !p.ranked);

  // Group into the suggested serpentine teams.
  const teams: DraftPlayer[][] = Array.from({ length: numTeams }, () => []);
  for (const p of players) teams[p.draftTeam - 1]?.push(p);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-ink2 hover:text-accent">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Draft board</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink2">
        All golfers ranked to seed balanced teams for next season. Order:{" "}
        <span className="text-ink">scoring average</span> (low) →{" "}
        <span className="text-ink">handicap</span> (low) →{" "}
        <span className="text-ink">points per week</span> (high) →{" "}
        <span className="text-ink">games played</span> (high) →{" "}
        <span className="text-ink">best round</span> (low). Rates are per-round, so a
        golfer who missed weeks is compared fairly. Anything still tied is flagged for a
        coin flip — never ordered by name.
      </p>
      <div className="mt-3 rounded-lg border border-sunset-500/30 bg-sunset-500/5 px-4 py-2.5 text-xs text-ink2">
        Run this on last season&apos;s numbers <span className="font-semibold text-ink">before</span> you
        archive &amp; start the new season. Snake order fills Team 1→{numTeams}, then back
        {" "}{numTeams}→1 each round, so every team gets one golfer from each tier.
      </div>

      {/* Ranked list */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-line">
        <div className="scroll-x">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wider text-ink2">
              <tr>
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Golfer</th>
                <th className="px-3 py-3 text-right" title="Scoring average, all rounds">Avg</th>
                <th className="px-3 py-3 text-right" title="Current handicap (Rule 10)">Hcp</th>
                <th className="px-3 py-3 text-right" title="Average points per week played">Pts/wk</th>
                <th className="px-3 py-3 text-right" title="Games played">GP</th>
                <th className="px-3 py-3 text-right" title="Best single round">Best</th>
                <th className="px-3 py-3 text-right" title="Suggested team · draft round">Pick</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ranked.map((p) => {
                const tie = p.tiedWithPrev || p.tiedWithNext;
                return (
                  <tr key={p.playerId} className={tie ? "bg-sunset-500/10" : "hover:bg-surface2"}>
                    <td className="px-3 py-2.5 font-mono text-ink3">{p.rank}</td>
                    <td className="px-3 py-2.5 font-medium">
                      {p.name}
                      {tie && (
                        <span className="ml-2 rounded bg-sunset-500/25 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                          tie — coin flip
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmt(p.scoringAvg, 2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-ink2">{fmt(p.handicap, 0)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmt(p.pointsPerWeek, 2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-ink2">{p.games}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-ink2">{fmt(p.bestRound, 0)}</td>
                    <td className="px-3 py-2.5 text-right text-ink2">
                      <span className="font-semibold text-ink">T{p.draftTeam}</span>
                      <span className="ml-1 text-xs text-ink3">R{p.draftRound}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {unranked.length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-surface/40 p-4 text-sm">
          <p className="font-medium">No prior scores — seed by hand:</p>
          <p className="mt-1 text-ink2">
            {unranked.map((p) => p.name).join(", ")}
          </p>
        </div>
      )}

      {/* Suggested teams */}
      <h2 className="mb-3 mt-10 text-lg font-semibold">Suggested teams (snake draft)</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((tm, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface/40 p-4">
            <h3 className="text-sm font-bold">Team {i + 1}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {tm.map((p) => (
                <li key={p.playerId} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 font-mono text-xs text-ink3">#{p.rank}</span>
                    {p.name}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-ink2">
                    {p.ranked ? `avg ${fmt(p.scoringAvg, 1)}` : "new"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-ink3">
        Suggestions only — nothing is saved. Use this to seed the draft, then set the
        final rosters in{" "}
        <Link href="/admin/roster" className="text-accent hover:underline">
          Teams &amp; roster
        </Link>
        .
      </p>
    </div>
  );
}
