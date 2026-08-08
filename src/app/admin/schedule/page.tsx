import { redirect } from "next/navigation";
import Link from "next/link";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getSchedule } from "@/lib/queries";
import {
  saveWeekAction,
  addWeekAction,
  removeWeekAction,
  generateAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule" };

export default async function ScheduleAdmin({
  searchParams,
}: {
  searchParams: { saved?: string; generated?: string };
}) {
  if (!adminConfigured() || !isAuthed()) redirect("/admin/login");
  if (!hasDb()) redirect("/admin");

  const weeks = await getSchedule();
  const input =
    "rounded-lg border border-white/10 bg-dusk-950 px-3 py-2 text-white outline-none focus:border-sunset-400";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-slate-400 hover:text-sunset-300">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Schedule</h1>
      <p className="mt-1 text-sm text-slate-400">
        Set each week&apos;s date, label, note, and matchups (one per line, e.g.{" "}
        <code className="rounded bg-white/10 px-1">10 v 1</code>). A week with a note
        (fun night, position round, banquet) is treated as a non-playing week.
      </p>

      {(searchParams.saved || searchParams.generated) && (
        <p className="mt-4 rounded-lg border border-fairway-500/40 bg-fairway-500/10 px-4 py-2.5 text-sm text-fairway-400">
          {searchParams.generated
            ? "Round-robin generated across the playing weeks. Review and tweak below."
            : "Week saved."}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={generateAction}>
          <button className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
            Generate round-robin
          </button>
        </form>
        <form action={addWeekAction}>
          <button className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
            + Add week
          </button>
        </form>
      </div>

      <div className="mt-6 space-y-4">
        {weeks.map((w) => (
          <form
            key={w.id}
            action={saveWeekAction}
            className="rounded-2xl border border-white/10 bg-dusk-800/40 p-4"
          >
            <input type="hidden" name="id" value={w.id} />
            <div className="flex flex-wrap gap-2">
              <input
                type="date"
                name="date"
                defaultValue={w.date ?? ""}
                className={`${input} w-40`}
              />
              <input
                name="label"
                defaultValue={w.label}
                placeholder="Label"
                className={`${input} w-28`}
              />
              <input
                name="note"
                defaultValue={w.note ?? ""}
                placeholder="Note (fun night, banquet…)"
                className={`${input} flex-1`}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <textarea
                name="matchups"
                rows={Math.max(2, w.matchups.length)}
                defaultValue={w.matchups.join("\n")}
                placeholder="10 v 1&#10;8 v 3"
                className={`${input} flex-1 font-mono text-sm`}
              />
              <div className="flex flex-col gap-2">
                <button className="rounded-lg bg-sunset-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sunset-600">
                  Save
                </button>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                formAction={removeWeekAction}
                className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10"
              >
                Delete week
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
