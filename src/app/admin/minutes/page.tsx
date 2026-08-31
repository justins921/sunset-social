import { redirect } from "next/navigation";
import Link from "next/link";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getMeetings } from "@/lib/queries";
import { addMeetingAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minutes" };

export default async function MinutesAdmin() {
  if (!adminConfigured() || !isAuthed()) redirect("/admin/login");
  if (!hasDb()) redirect("/admin");
  const meetings = await getMeetings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-ink2 hover:text-accent">
        ← Admin
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Meeting minutes</h1>
        <form action={addMeetingAction}>
          <button className="rounded-lg bg-sunset-500 px-4 py-2 text-sm font-semibold text-ink hover:bg-sunset-600">
            + New meeting
          </button>
        </form>
      </div>
      <p className="mt-1 text-sm text-ink2">
        Record who was present and what was discussed, voted on, and decided.
        Minutes are posted for members on the public{" "}
        <Link href="/minutes" className="text-accent hover:underline">
          minutes
        </Link>{" "}
        page.
      </p>

      <div className="mt-6 space-y-2">
        {meetings.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface/40 p-8 text-center text-ink2">
            No meetings recorded yet.
          </div>
        ) : (
          meetings.map((m) => (
            <Link
              key={m.id}
              href={`/admin/minutes/${m.id}`}
              className="flex items-center justify-between rounded-xl border border-line bg-surface/40 px-4 py-3 hover:border-sunset-500/40"
            >
              <span>
                <span className="font-semibold">{m.title}</span>
                <span className="ml-2 text-sm text-ink3">{m.date ?? "no date"}</span>
              </span>
              <span className="text-xs text-ink2">{m.present} present</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
