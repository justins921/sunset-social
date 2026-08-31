import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { LEAGUE, FUN_NIGHTS } from "@/data/league";
import { getSchedule, getRoster, type RosterPlayer } from "@/lib/queries";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

function isPast(dateISO: string | null) {
  if (!dateISO) return false;
  const d = new Date(dateISO + "T23:59:59");
  return d < new Date();
}

const SLOT_ORDER = ["A", "B", "C", "D"];

/** Parse "10 v 1 (Rain Makeup)" → { home: 10, away: 1, note: "Rain Makeup" }. */
function parseMatchup(m: string): { home: number | null; away: number | null; note: string | null } {
  const match = m.match(/^\s*(\d+)\s*v\s*(\d+)\s*(?:\((.+)\))?\s*$/i);
  if (!match) return { home: null, away: null, note: m };
  return {
    home: Number(match[1]),
    away: Number(match[2]),
    note: match[3]?.trim() || null,
  };
}

function MatchupCard({
  raw,
  playersByTeam,
  teamName,
}: {
  raw: string;
  playersByTeam: Map<number, RosterPlayer[]>;
  teamName: Map<number, string>;
}) {
  const { home, away, note } = parseMatchup(raw);
  const homePlayers = home ? playersByTeam.get(home) ?? [] : [];
  const awayPlayers = away ? playersByTeam.get(away) ?? [] : [];
  const rowCount = Math.max(homePlayers.length, awayPlayers.length, 0);

  return (
    <div className="rounded-lg border border-line bg-surface2 p-3">
      <div className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold">
        <span className="text-ink">{home ? teamName.get(home) ?? `Team ${home}` : "?"}</span>
        <span className="text-ink3">vs</span>
        <span className="text-ink">{away ? teamName.get(away) ?? `Team ${away}` : "?"}</span>
        {note && (
          <span className="rounded bg-sunset-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent">
            {note}
          </span>
        )}
      </div>
      {rowCount > 0 ? (
        <div className="space-y-1">
          {Array.from({ length: rowCount }).map((_, i) => {
            const h = homePlayers[i];
            const a = awayPlayers[i];
            return (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs"
              >
                <span className="truncate text-right text-ink">
                  {h?.name ?? "—"}
                </span>
                <span className="font-mono text-[10px] text-ink3">
                  {h?.slot ?? a?.slot ?? SLOT_ORDER[i] ?? ""}
                </span>
                <span className="truncate text-left text-ink">
                  {a?.name ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center font-mono text-xs text-ink2">{raw}</p>
      )}
    </div>
  );
}

export default async function SchedulePage() {
  const [SCHEDULE, roster] = await Promise.all([getSchedule(), getRoster()]);
  const nextIdx = SCHEDULE.findIndex((w) => !isPast(w.date));

  // team id → players (sorted A–D) and team id → name
  const playersByTeam = new Map<number, RosterPlayer[]>();
  const teamName = new Map<number, string>();
  for (const t of roster.teams) {
    teamName.set(t.id, t.name);
    playersByTeam.set(
      t.id,
      [...t.players].sort(
        (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot),
      ),
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={`${LEAGUE.season} season`}
        title="Weekly schedule"
        subtitle={`Matches are played ${LEAGUE.playDay}s at ${LEAGUE.course}. Tee times ${LEAGUE.teeTimes}. Each card shows the golfers playing head-to-head that night.`}
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <ol className="relative space-y-3 border-l border-line pl-6">
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
                        ? "border-line bg-surface"
                        : "border-sunset-500/60 bg-surface"
                  }`}
                  aria-hidden
                />
                <div
                  className={`rounded-xl border px-4 py-3 transition ${
                    isNext
                      ? "border-sunset-500/40 bg-sunset-500/10"
                      : "border-line bg-surface/40"
                  } ${past ? "opacity-70" : ""}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-3">
                      <span className="font-semibold text-ink">{w.label}</span>
                      {isNext && (
                        <span className="rounded-full bg-sunset-500/25 px-2 py-0.5 text-xs font-medium text-accent">
                          Up next
                        </span>
                      )}
                    </span>
                    {w.matchups.length > 0 && (
                      <span className="text-xs text-ink3">
                        {w.matchups.length} match{w.matchups.length === 1 ? "" : "es"}
                      </span>
                    )}
                  </div>
                  {w.note && (
                    <p className="mt-1 text-sm font-medium text-accent">{w.note}</p>
                  )}
                  {w.matchups.length > 0 && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {w.matchups.map((m) => (
                        <MatchupCard
                          key={m}
                          raw={m}
                          playersByTeam={playersByTeam}
                          teamName={teamName}
                        />
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
                className="rounded-2xl border border-line bg-surface/40 p-5"
              >
                <h3 className="font-semibold text-accent">{f.name}</h3>
                <p className="mt-2 text-sm text-ink2">{f.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-ink2">
            The banquet is held at Jeff&apos;s on Rugby, on the corner of 10th Ave and Rugby.
          </p>
        </div>
      </div>
    </div>
  );
}
