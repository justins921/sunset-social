import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { getMeetings } from "@/lib/queries";

export const metadata: Metadata = { title: "Minutes" };
export const dynamic = "force-dynamic";

export default async function MinutesPage() {
  const meetings = await getMeetings();

  return (
    <div>
      <PageHeader
        eyebrow="League records"
        title="Meeting minutes"
        subtitle="A record of league meetings — who attended, what was discussed, and what was decided."
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {meetings.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface/40 p-8 text-center text-ink2">
            No meeting minutes have been posted yet.
          </div>
        ) : (
          <div className="space-y-6">
            {meetings.map((m) => (
              <article
                key={m.id}
                className="rounded-2xl border border-line bg-surface/40 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">{m.title}</h2>
                  <span className="text-sm text-ink3">
                    {m.date ?? ""} · {m.present} present
                  </span>
                </div>
                {m.notes ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink2">
                    {m.notes}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-ink3">No notes recorded.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
