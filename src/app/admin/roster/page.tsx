import { redirect } from "next/navigation";
import Link from "next/link";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getRoster } from "@/lib/queries";
import {
  saveRosterAction,
  addSubAction,
  updateSubAction,
  removeSubAction,
  startNewSeasonAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Teams & roster" };

export default async function RosterPage({
  searchParams,
}: {
  searchParams: { saved?: string; reset?: string };
}) {
  if (!adminConfigured() || !isAuthed()) redirect("/admin/login");
  if (!hasDb()) redirect("/admin");

  const roster = await getRoster();

  const input =
    "w-full rounded-lg border border-line bg-page px-3 py-2 text-ink outline-none focus:border-sunset-400";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-ink2 hover:text-accent">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Teams &amp; roster</h1>
      <p className="mt-1 text-sm text-ink2">
        Rename teams and set each golfer. Type a new name into a slot to swap a
        player in. Changes appear on the public site immediately.
      </p>

      {searchParams.saved === "1" && (
        <p className="mt-4 rounded-lg border border-fairway-500/40 bg-fairway-500/10 px-4 py-2.5 text-sm text-fairway-400">
          Roster saved.
        </p>
      )}

      {/* Roster form */}
      <form action={saveRosterAction} className="mt-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {roster.teams.map((t) => (
            <div key={t.id} className="rounded-2xl border border-line bg-surface/40 p-4">
              <input
                name={`teamname_${t.id}`}
                defaultValue={t.name}
                className={`${input} mb-3 font-semibold`}
              />
              <div className="space-y-2">
                {t.players.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="w-5 font-mono text-xs text-ink3">{p.slot}</span>
                    <input
                      name={`pname_${p.id}`}
                      defaultValue={p.name}
                      placeholder="Name"
                      className={`${input} flex-1`}
                    />
                    <input
                      name={`pphone_${p.id}`}
                      defaultValue={p.phone ?? ""}
                      placeholder="Phone"
                      className={`${input} w-32`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-4 mt-6 flex items-center justify-end rounded-xl border border-line bg-surface/90 px-4 py-3 backdrop-blur">
          <button className="rounded-lg bg-sunset-500 px-5 py-2.5 font-semibold text-ink transition hover:bg-sunset-600">
            Save roster
          </button>
        </div>
      </form>

      {/* Subs */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold">Substitutes</h2>
        <div className="mt-3 space-y-2">
          {roster.subs.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface/40 p-2"
            >
              <form action={updateSubAction} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="id" value={s.id} />
                <input name="name" defaultValue={s.name} className={`${input} flex-1`} />
                <input
                  name="phone"
                  defaultValue={s.phone ?? ""}
                  placeholder="Phone"
                  className={`${input} w-32`}
                />
                <button className="rounded-lg border border-line px-3 py-2 text-sm text-ink2 hover:bg-surface2">
                  Save
                </button>
              </form>
              <form action={removeSubAction}>
                <input type="hidden" name="id" value={s.id} />
                <button className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10">
                  Remove
                </button>
              </form>
            </div>
          ))}
        </div>
        <form action={addSubAction} className="mt-3 flex flex-wrap items-center gap-2">
          <input name="name" placeholder="Add substitute name" className={`${input} flex-1`} />
          <input name="phone" placeholder="Phone" className={`${input} w-32`} />
          <button className="rounded-lg bg-surface2 px-4 py-2 text-sm text-ink hover:bg-surface2">
            Add sub
          </button>
        </form>
      </div>

      {/* New season */}
      <div className="mt-12 rounded-2xl border border-sunset-500/30 bg-sunset-500/5 p-5">
        <h2 className="text-lg font-semibold text-accent">Start a new season</h2>
        <p className="mt-1 text-sm text-ink2">
          First the entire current season — roster, schedule, scores, team points,
          recaps, dues, ledger and minutes, plus the final standings — is saved to
          the{" "}
          <Link href="/admin/seasons" className="text-accent hover:underline">
            season archive
          </Link>
          . Then those are cleared for the new year (the roster and schedule stay so
          you can re-draft and re-generate).
        </p>
        {searchParams.reset === "done" && (
          <p className="mt-3 rounded-lg border border-fairway-500/40 bg-fairway-500/10 px-4 py-2.5 text-sm text-fairway-400">
            Previous season archived and cleared. The roster and schedule were kept.
          </p>
        )}
        <form action={startNewSeasonAction} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            name="label"
            placeholder="Season to archive (e.g. 2026)"
            className={`${input} w-52`}
          />
          <input
            name="confirm"
            placeholder="Type RESET to confirm"
            className={`${input} w-44`}
          />
          <button className="rounded-lg border border-sunset-500/40 bg-sunset-500/10 px-4 py-2 text-sm font-semibold text-accent hover:bg-sunset-500/20">
            Archive &amp; start new season
          </button>
        </form>
        {searchParams.reset === "confirm" && (
          <p className="mt-2 text-xs text-accent">
            Type the word RESET in the box to confirm.
          </p>
        )}
      </div>
    </div>
  );
}
