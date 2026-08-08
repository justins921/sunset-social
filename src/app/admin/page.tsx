import { redirect } from "next/navigation";
import Link from "next/link";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getAdminWeeks } from "@/lib/queries";
import { logoutAction } from "@/app/admin/actions";
import { LEAGUE } from "@/data/league";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminDashboard() {
  if (!adminConfigured() || !isAuthed()) redirect("/admin/login");

  const dbReady = hasDb();
  const weeks = dbReady ? await getAdminWeeks() : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sunset-300">
            Secretary tools
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Secretary tools</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-slate-400 hover:text-sunset-300">
            View site
          </Link>
          <form action={logoutAction}>
            <button className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {dbReady && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { href: "/admin/roster", title: "Teams & roster", sub: "Players, subs, new season" },
            { href: "/admin/schedule", title: "Schedule", sub: "Weeks, matchups, generator" },
            { href: "/admin/treasury", title: "Treasury", sub: "Dues, ledger, balance" },
            { href: "/admin/minutes", title: "Minutes", sub: "Meetings & attendance" },
            { href: "/admin/seasons", title: "Season archive", sub: "Past seasons, saved in full" },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-2xl border border-white/10 bg-dusk-800/40 p-4 hover:border-sunset-500/40"
            >
              <p className="font-semibold">{c.title}</p>
              <p className="mt-1 text-sm text-slate-400">{c.sub}</p>
            </Link>
          ))}
        </div>
      )}

      {dbReady && (
        <h2 className="mt-8 text-lg font-semibold">Weekly score entry</h2>
      )}

      {!dbReady ? (
        <div className="mt-8 rounded-2xl border border-sunset-500/30 bg-sunset-500/10 p-6 text-sm text-slate-200">
          <p className="font-semibold text-sunset-200">Connect a database</p>
          <p className="mt-2">
            No Postgres connection was found. In Vercel, add a Postgres store to
            this project (Storage → Create → Postgres) and redeploy. The tables
            and current standings seed themselves automatically on first load.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-400">
            Pick a week to enter each golfer&apos;s 9-hole score and points. Points
            you enter here add to the season totals and appear on the public{" "}
            <Link href="/results" className="text-sunset-300 hover:underline">
              results
            </Link>{" "}
            and{" "}
            <Link href="/standings" className="text-sunset-300 hover:underline">
              standings
            </Link>{" "}
            pages.
          </p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3 text-center">Scores</th>
                  <th className="px-4 py-3 text-center">Recap</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {weeks.map((w) => (
                  <tr key={w.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold">
                      {w.label}
                      {!w.entryOpen && (
                        <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                          Baseline
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{w.note ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-mono">
                      {w.resultCount > 0 ? w.resultCount : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {w.hasRecap ? "✓" : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/week/${w.id}`}
                        className="rounded-lg bg-sunset-500/20 px-3 py-1.5 text-sunset-100 hover:bg-sunset-500/30"
                      >
                        Enter
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-dusk-800/40 p-4 text-xs text-slate-400">
            <p>
              Standings are the running sum of every week&apos;s points. Weeks
              through {LEAGUE.standingsAsOf} are pre-loaded from the 2026 results
              sheets; just enter each new night going forward.{" "}
              <span className="font-semibold text-slate-300">Team points</span>{" "}
              are entered per team (they aren&apos;t the sum of the four players —
              absent players still earn team points), alongside each golfer&apos;s
              strokes and points.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
