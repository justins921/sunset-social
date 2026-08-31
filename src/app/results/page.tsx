import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getResultsWeeks, getSeasonMeta, type ResultRow } from "@/lib/queries";
import { LEAGUE } from "@/data/league";

export const metadata: Metadata = { title: "Results" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  played: "",
  sub: "Sub",
  absent: "Absent",
  forfeit: "Forfeit",
  rainout: "Rainout",
};

function StatusTag({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  if (!label) return null;
  return (
    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
      {label}
    </span>
  );
}

function WeekCard({
  week,
}: {
  week: Awaited<ReturnType<typeof getResultsWeeks>>[number];
}) {
  const played = week.rows.filter((r) => r.strokes !== null || r.points !== null);
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-dusk-800/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-5 py-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">{week.label}</h2>
            <Link
              href={`/print/week/${week.id}`}
              className="rounded-md border border-white/15 px-2 py-0.5 text-xs text-slate-300 hover:border-sunset-500/40 hover:text-sunset-200"
            >
              Export PDF
            </Link>
          </div>
          {week.note && <p className="text-sm text-sunset-200">{week.note}</p>}
        </div>
        {(week.lowScores || week.fiftyFifty) && (
          <div className="text-right text-sm">
            {week.lowScores && (
              <p>
                <span className="text-slate-400">Low: </span>
                <span className="text-slate-100">{week.lowScores}</span>
              </p>
            )}
            {week.fiftyFifty && (
              <p>
                <span className="text-slate-400">50/50: </span>
                <span className="text-slate-100">{week.fiftyFifty}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {week.teamPoints.some((tp) => tp.points > 0) && (
        <div className="flex flex-wrap gap-1.5 border-b border-white/10 px-5 py-3">
          {week.teamPoints
            .filter((tp) => tp.points > 0)
            .map((tp) => (
            <span
              key={tp.teamId}
              className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-300"
              title={`${tp.teamName} team points`}
            >
              {tp.teamName}
              <span className="ml-1.5 font-mono font-semibold text-sunset-200">
                {tp.points.toFixed(1)}
              </span>
            </span>
          ))}
        </div>
      )}

      {played.length > 0 ? (
        <div className="scroll-x">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-2 font-normal">Golfer</th>
                <th className="px-5 py-2 font-normal">Team</th>
                <th className="px-5 py-2 text-right font-normal">Strokes</th>
                <th className="px-5 py-2 text-right font-normal">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {played.map((r: ResultRow) => (
                <tr key={r.playerId} className="hover:bg-white/5">
                  <td className="px-5 py-2.5 font-medium">
                    {r.name}
                    <StatusTag status={r.status} />
                  </td>
                  <td className="px-5 py-2.5 text-slate-400">{r.teamName}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-slate-200">
                    {r.strokes ?? "—"}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono font-semibold text-sunset-200">
                    {r.points !== null ? r.points.toFixed(1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-4 text-sm text-slate-400">
          Highlights recorded — full scorecard not entered for this night.
        </p>
      )}
    </section>
  );
}

export default async function ResultsPage() {
  const [weeks, meta] = await Promise.all([getResultsWeeks(), getSeasonMeta()]);

  return (
    <div>
      <PageHeader
        eyebrow={meta.complete ? `${LEAGUE.season} season · complete ${meta.asOf}` : `${LEAGUE.season} season · through ${meta.asOf}`}
        title="Weekly results"
        subtitle="Scores, points, low rounds and 50/50 winners, week by week. Most recent night first."
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {weeks.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-dusk-800/40 p-8 text-center">
            <p className="text-slate-300">No weekly results have been posted yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Check the{" "}
              <Link href="/standings" className="text-sunset-300 hover:underline">
                standings
              </Link>{" "}
              for season totals in the meantime.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {weeks.map((w) => (
              <WeekCard key={w.id} week={w} />
            ))}
          </div>
        )}

        <p className="mt-8 text-xs text-slate-500">
          Weekly scores are entered by the secretary after each league night and
          feed directly into the{" "}
          <Link href="/standings" className="text-sunset-300 hover:underline">
            standings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
