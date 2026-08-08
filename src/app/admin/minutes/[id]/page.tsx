import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getMeeting } from "@/lib/queries";
import { saveMeetingAction, deleteMeetingAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meeting" };

export default async function MeetingEdit({
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
  const m = await getMeeting(id);
  if (!m) notFound();

  const present = new Set(m.attendeeIds);
  const quorumNeeded = Math.ceil(m.memberCount / 2);
  const hasQuorum = m.present >= quorumNeeded;
  const input =
    "rounded-lg border border-white/10 bg-dusk-950 px-3 py-2 text-white outline-none focus:border-sunset-400";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/admin/minutes" className="text-sm text-slate-400 hover:text-sunset-300">
        ← All meetings
      </Link>

      {searchParams.saved === "1" && (
        <p className="mt-4 rounded-lg border border-fairway-500/40 bg-fairway-500/10 px-4 py-2.5 text-sm text-fairway-400">
          Meeting saved.
        </p>
      )}

      <form action={saveMeetingAction} className="mt-4">
        <input type="hidden" name="id" value={m.id} />
        <div className="flex flex-wrap gap-2">
          <input type="date" name="date" defaultValue={m.date ?? ""} className={`${input} w-44`} />
          <input
            name="title"
            defaultValue={m.title}
            placeholder="Title"
            className={`${input} flex-1`}
          />
        </div>
        <textarea
          name="notes"
          rows={10}
          defaultValue={m.notes ?? ""}
          placeholder="What was discussed, voted on, and the results…"
          className={`${input} mt-3 w-full`}
        />

        {/* Attendance */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Attendance</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                hasQuorum
                  ? "bg-fairway-500/20 text-fairway-400"
                  : "bg-white/10 text-slate-300"
              }`}
            >
              {m.present}/{m.memberCount} present · quorum {quorumNeeded}{" "}
              {hasQuorum ? "✓ met" : "not met"}
            </span>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {m.roster.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-dusk-800/40 p-3">
                <p className="mb-2 text-sm font-semibold">{t.name}</p>
                <div className="space-y-1.5">
                  {t.players.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="present"
                        value={p.id}
                        defaultChecked={present.has(p.id)}
                        className="h-4 w-4 rounded border-white/20 bg-dusk-950"
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-4 mt-6 flex items-center justify-between rounded-xl border border-white/10 bg-dusk-900/90 px-4 py-3 backdrop-blur">
          <button
            formAction={deleteMeetingAction}
            className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10"
          >
            Delete meeting
          </button>
          <button className="rounded-lg bg-sunset-500 px-5 py-2.5 font-semibold text-white hover:bg-sunset-600">
            Save meeting
          </button>
        </div>
      </form>
    </div>
  );
}
