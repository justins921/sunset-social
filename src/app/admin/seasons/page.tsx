import { redirect } from "next/navigation";
import Link from "next/link";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getArchivedSeasons } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Season archive" };

export default async function SeasonsArchive() {
  if (!adminConfigured() || !isAuthed()) redirect("/admin/login");
  if (!hasDb()) redirect("/admin");
  const seasons = await getArchivedSeasons();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-slate-400 hover:text-sunset-300">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Season archive</h1>
      <p className="mt-1 text-sm text-slate-400">
        Every past season is saved here in full when you start a new one — the
        complete roster, schedule, scores, treasury and minutes are preserved.
      </p>

      {seasons.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-dusk-800/40 p-8 text-center text-slate-400">
          No archived seasons yet. When you start a new season, the current one is
          saved here first.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {seasons.map((s) => (
            <div key={s.id} className="rounded-2xl border border-white/10 bg-dusk-800/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">{s.label}</h2>
                <span className="text-xs text-slate-500">Archived {s.archivedOn}</span>
              </div>
              {s.champion && (
                <p className="mt-1 text-sm text-sunset-200">🏆 Champion: {s.champion}</p>
              )}
              {s.standings.length > 0 && (
                <ol className="mt-3 grid gap-1 sm:grid-cols-2">
                  {s.standings.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-sm"
                    >
                      <span>
                        <span className="mr-2 font-mono text-xs text-slate-500">
                          {t.place}
                        </span>
                        {t.name}
                      </span>
                      <span className="font-mono text-sunset-200">
                        {t.points.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
