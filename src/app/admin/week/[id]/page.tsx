import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getWeekEntry } from "@/lib/queries";
import { saveWeekAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Enter scores" };

const STATUSES = [
  { value: "played", label: "Played" },
  { value: "sub", label: "Sub" },
  { value: "absent", label: "Absent" },
  { value: "forfeit", label: "Forfeit" },
  { value: "rainout", label: "Rainout" },
];

export default async function WeekEntryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string };
}) {
  if (!adminConfigured() || !isAuthed()) redirect("/admin/login");
  if (!hasDb()) redirect("/admin");

  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const week = await getWeekEntry(id);
  if (!week) notFound();

  // Group players by team, preserving team/sort order.
  const teams: { teamId: number; teamName: string; players: typeof week.players }[] = [];
  for (const p of week.players) {
    let group = teams.find((t) => t.teamId === p.teamId);
    if (!group) {
      group = { teamId: p.teamId, teamName: p.teamName, players: [] };
      teams.push(group);
    }
    group.players.push(p);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-slate-400 hover:text-sunset-300">
        ← All weeks
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{week.label}</h1>
          {week.note && <p className="text-sm text-sunset-200">{week.note}</p>}
        </div>
        {!week.entryOpen && (
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
            Baseline week — entries here add on top of season totals
          </span>
        )}
      </div>

      {searchParams.saved === "1" && (
        <p className="mt-4 rounded-lg border border-fairway-500/40 bg-fairway-500/10 px-4 py-2.5 text-sm text-fairway-400">
          Saved. Public standings and results have been updated.
        </p>
      )}

      <form action={saveWeekAction} className="mt-6">
        <input type="hidden" name="weekId" value={week.id} />

        <div className="space-y-6">
          {teams.map((group) => (
            <div
              key={group.teamId}
              className="overflow-hidden rounded-2xl border border-white/10"
            >
              <div className="bg-white/5 px-4 py-2.5 text-sm font-semibold">
                {group.teamName}
              </div>
              <div className="scroll-x">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-normal">Golfer</th>
                      <th className="px-4 py-2 font-normal">Strokes</th>
                      <th className="px-4 py-2 font-normal">Points</th>
                      <th className="px-4 py-2 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {group.players.map((p) => (
                      <tr key={p.playerId}>
                        <td className="px-4 py-2.5">
                          <input type="hidden" name="playerId" value={p.playerId} />
                          <span className="mr-2 font-mono text-xs text-slate-500">
                            {p.slot}
                          </span>
                          {p.name}
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={20}
                            max={99}
                            name={`strokes_${p.playerId}`}
                            defaultValue={p.strokes ?? ""}
                            className="w-20 rounded-lg border border-white/10 bg-dusk-950 px-2 py-1.5 text-white outline-none focus:border-sunset-400"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            inputMode="decimal"
                            step={0.5}
                            min={0}
                            max={10}
                            name={`points_${p.playerId}`}
                            defaultValue={p.points ?? ""}
                            className="w-20 rounded-lg border border-white/10 bg-dusk-950 px-2 py-1.5 text-white outline-none focus:border-sunset-400"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            name={`status_${p.playerId}`}
                            defaultValue={p.status}
                            className="rounded-lg border border-white/10 bg-dusk-950 px-2 py-1.5 text-white outline-none focus:border-sunset-400"
                          >
                            {STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Recap */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-dusk-800/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-sunset-300">
            Night recap (optional)
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300" htmlFor="lowScores">
                Low score(s)
              </label>
              <input
                id="lowScores"
                name="lowScores"
                defaultValue={week.lowScores ?? ""}
                placeholder="e.g. Ben Pitz — Even Par 35"
                className="w-full rounded-lg border border-white/10 bg-dusk-950 px-3 py-2 text-white outline-none focus:border-sunset-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300" htmlFor="fiftyFifty">
                50/50 winner
              </label>
              <input
                id="fiftyFifty"
                name="fiftyFifty"
                defaultValue={week.fiftyFifty ?? ""}
                placeholder="e.g. Mike & Alan Lloyd — $130"
                className="w-full rounded-lg border border-white/10 bg-dusk-950 px-3 py-2 text-white outline-none focus:border-sunset-400"
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-4 mt-6 flex items-center justify-between rounded-xl border border-white/10 bg-dusk-900/90 px-4 py-3 backdrop-blur">
          <p className="text-xs text-slate-400">
            Leave a golfer blank to skip. Blank rows are removed on save.
          </p>
          <button
            type="submit"
            className="rounded-lg bg-sunset-500 px-5 py-2.5 font-semibold text-white transition hover:bg-sunset-600"
          >
            Save week
          </button>
        </div>
      </form>
    </div>
  );
}
