import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { LEAGUE, FUN_NIGHTS } from "@/data/league";
import { getSchedule } from "@/lib/queries";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

function isPast(dateISO: string | null) {
  if (!dateISO) return false;
  const d = new Date(dateISO + "T23:59:59");
  return d < new Date();
}

export default async function SchedulePage() {
  const SCHEDULE = await getSchedule();
  const nextIdx = SCHEDULE.findIndex((w) => !isPast(w.date));

  return (
    <div>
      <PageHeader
        eyebrow={`${LEAGUE.season} season`}
        title="Weekly schedule"
        subtitle={`Matches are played ${LEAGUE.playDay}s at ${LEAGUE.course}. Tee times ${LEAGUE.teeTimes}. Numbers below are team match-ups for the night.`}
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <ol className="relative space-y-3 border-l border-white/10 pl-6">
          {SCHEDULE.map((w, i) => {
            const past = isPast(w.date);
            const isNext = i === nextIdx;
            return (
              <li key={w.id} className="relative">
                <span
                  className={`absolute -left-[27px] top-3 h-3 w-3 rounded-full border-2 ${
                    isNext
                      ? "border-sunset-300 bg-sunset-400"
                      : past
                        ? "border-white/20 bg-dusk-800"
                        : "border-sunset-500/60 bg-dusk-800"
                  }`}
                  aria-hidden
                />
                <div
                  className={`rounded-xl border px-4 py-3 transition ${
                    isNext
                      ? "border-sunset-500/40 bg-sunset-500/10"
                      : "border-white/10 bg-dusk-800/40"
                  } ${past ? "opacity-70" : ""}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-3">
                      <span className="font-semibold text-white">{w.label}</span>
                      {isNext && (
                        <span className="rounded-full bg-sunset-500/25 px-2 py-0.5 text-xs font-medium text-sunset-100">
                          Up next
                        </span>
                      )}
                    </span>
                    {w.matchups.length > 0 && (
                      <span className="text-xs text-slate-500">
                        {w.matchups.length} match{w.matchups.length === 1 ? "" : "es"}
                      </span>
                    )}
                  </div>
                  {w.note && (
                    <p className="mt-1 text-sm font-medium text-sunset-200">{w.note}</p>
                  )}
                  {w.matchups.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {w.matchups.map((m) => (
                        <span
                          key={m}
                          className="rounded-md bg-white/5 px-2 py-1 font-mono text-xs text-slate-300"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Fun night formats */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Fun-night formats</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {FUN_NIGHTS.map((f) => (
              <div
                key={f.name}
                className="rounded-2xl border border-white/10 bg-dusk-800/40 p-5"
              >
                <h3 className="font-semibold text-sunset-200">{f.name}</h3>
                <p className="mt-2 text-sm text-slate-300">{f.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-400">
            The banquet is held at Jeff&apos;s on Rugby, on the corner of 10th Ave and Rugby.
          </p>
        </div>
      </div>
    </div>
  );
}
