import { notFound } from "next/navigation";
import Link from "next/link";
import { LEAGUE } from "@/data/league";
import { getWeekReport } from "@/lib/queries";
import { PrintButton } from "@/components/PrintButton";
import { FitToPage } from "@/components/FitToPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Results report" };

const STATUS_LABEL: Record<string, string> = {
  sub: "Sub",
  absent: "Absent",
  forfeit: "Forfeit",
  rainout: "Rainout",
};

export default async function WeekReportPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const r = await getWeekReport(id);
  if (!r) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 print:m-0 print:max-w-none print:p-0">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/results" className="text-sm text-slate-400 hover:text-sunset-300">
          ← Results
        </Link>
        <PrintButton />
      </div>

      {/* The printable sheet */}
      <FitToPage>
      <div className="print-sheet rounded-xl bg-white p-6 text-slate-900 shadow sm:p-8">
        <header className="border-b border-slate-300 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {LEAGUE.name} · {LEAGUE.season}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{r.label} — Results</h1>
          {r.note && <p className="mt-1 text-sm font-medium text-slate-700">{r.note}</p>}
          <p className="mt-1 text-sm text-slate-500">
            {LEAGUE.course} · {r.playDate ?? ""}
          </p>
        </header>

        {(r.lowScores || r.fiftyFifty) && (
          <div className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
            {r.lowScores && (
              <p>
                <span className="font-semibold">Low score:</span> {r.lowScores}
              </p>
            )}
            {r.fiftyFifty && (
              <p>
                <span className="font-semibold">50/50:</span> {r.fiftyFifty}
              </p>
            )}
          </div>
        )}

        {/* This week's scorecards */}
        {r.cards.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              This week&apos;s scores
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {r.cards.map((c) => (
                <div key={c.teamId} className="rounded-lg border border-slate-300">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold">
                    <span>{c.name}</span>
                    <span>{c.teamPoints !== null ? `${c.teamPoints.toFixed(1)} pts` : ""}</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {c.players.map((p, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-1">
                            <span className="mr-1.5 font-mono text-xs text-slate-400">
                              {p.slot}
                            </span>
                            {p.name}
                            {STATUS_LABEL[p.status] && (
                              <span className="ml-1 text-xs text-slate-500">
                                ({STATUS_LABEL[p.status]})
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1 text-right font-mono text-slate-600">
                            {p.strokes ?? "—"}
                          </td>
                          <td className="px-3 py-1 text-right font-mono font-semibold">
                            {p.points !== null ? p.points.toFixed(1) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Standings as of this week */}
        <section className="mt-6 break-inside-avoid">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            Team standings — through {r.label}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
                <th className="py-1 pr-2">#</th>
                <th className="py-1">Team</th>
                <th className="py-1 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {r.teamStandings.map((t) => (
                <tr key={t.id} className="border-b border-slate-100">
                  <td className="py-1 pr-2 font-mono text-slate-500">{t.place}</td>
                  <td className="py-1 font-medium">{t.name}</td>
                  <td className="py-1 text-right font-mono font-semibold">
                    {t.points.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Individual points */}
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            Individual points — through {r.label}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
                <th className="py-1 pr-2">#</th>
                <th className="py-1">Golfer</th>
                <th className="py-1">Team</th>
                <th className="py-1 text-right">Hcp</th>
                <th className="py-1 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {r.individual.map((p, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1 pr-2 font-mono text-slate-500">{p.place}</td>
                  <td className="py-1 font-medium">{p.name}</td>
                  <td className="py-1 text-slate-600">{p.teamName}</td>
                  <td className="py-1 text-right font-mono text-slate-600">
                    {p.handicap ?? "—"}
                  </td>
                  <td className="py-1 text-right font-mono font-semibold">
                    {p.points.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-400">
          {LEAGUE.name} · Generated from the league website.
        </p>
      </div>
      </FitToPage>
    </div>
  );
}
