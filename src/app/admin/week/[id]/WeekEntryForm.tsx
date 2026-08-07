"use client";

import { useMemo, useState } from "react";
import { saveWeekAction } from "@/app/admin/actions";
import type { WeekEntry } from "@/lib/queries";

const STATUSES = [
  { value: "played", label: "Played" },
  { value: "sub", label: "Sub" },
  { value: "absent", label: "Absent" },
  { value: "forfeit", label: "Forfeit" },
  { value: "rainout", label: "Rainout" },
];

const ABSENT_FILL = 3.5; // Rule 9b: an absent player's team still earns points.

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

type Row = { points: string; status: string };

export function WeekEntryForm({ week }: { week: WeekEntry }) {
  // Controlled state only for the fields that drive the team-points auto-calc.
  const [rows, setRows] = useState<Record<number, Row>>(() => {
    const r: Record<number, Row> = {};
    for (const p of week.players) {
      r[p.playerId] = {
        points: p.points === null || p.points === undefined ? "" : String(p.points),
        status: p.status,
      };
    }
    return r;
  });

  // Per-team manual override. null = follow the live auto-calc.
  const [override, setOverride] = useState<Record<number, string | null>>(() => {
    const o: Record<number, string | null> = {};
    for (const p of week.players) {
      if (!(p.teamId in o)) {
        const stored = week.teamPoints[p.teamId];
        o[p.teamId] = stored === null || stored === undefined ? null : fmt(stored);
      }
    }
    return o;
  });

  const teams = useMemo(() => {
    const list: { teamId: number; teamName: string; players: typeof week.players }[] = [];
    for (const p of week.players) {
      let g = list.find((t) => t.teamId === p.teamId);
      if (!g) {
        g = { teamId: p.teamId, teamName: p.teamName, players: [] };
        list.push(g);
      }
      g.players.push(p);
    }
    return list;
  }, [week.players]);

  const autoTeam = (teamId: number): number => {
    let sum = 0;
    for (const p of week.players) {
      if (p.teamId !== teamId) continue;
      const row = rows[p.playerId];
      const v = parseFloat(row.points);
      if (!Number.isNaN(v)) sum += v;
      if (row.status === "absent") sum += ABSENT_FILL;
    }
    return Math.round(sum * 10) / 10;
  };

  const teamValue = (teamId: number): string => {
    const o = override[teamId];
    return o !== null && o !== undefined ? o : fmt(autoTeam(teamId));
  };

  const setPoints = (id: number, v: string) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], points: v } }));
  const setStatus = (id: number, v: string) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], status: v } }));

  return (
    <form action={saveWeekAction} className="mt-6">
      <input type="hidden" name="weekId" value={week.id} />

      <div className="space-y-6">
        {teams.map((group) => {
          const isAuto = override[group.teamId] === null || override[group.teamId] === undefined;
          return (
            <div
              key={group.teamId}
              className="overflow-hidden rounded-2xl border border-white/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white/5 px-4 py-2.5">
                <span className="text-sm font-semibold">{group.teamName}</span>
                <div className="flex items-center gap-2">
                  <input type="hidden" name="teamId" value={group.teamId} />
                  <label className="text-xs text-slate-400">Team points</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={0.5}
                    min={0}
                    name={`teampts_${group.teamId}`}
                    value={teamValue(group.teamId)}
                    onChange={(e) =>
                      setOverride((o) => ({ ...o, [group.teamId]: e.target.value }))
                    }
                    className={`w-20 rounded-lg border px-2 py-1 text-white outline-none focus:border-sunset-400 ${
                      isAuto
                        ? "border-sunset-500/40 bg-sunset-500/10"
                        : "border-white/10 bg-dusk-950"
                    }`}
                  />
                  {isAuto ? (
                    <span
                      className="rounded bg-sunset-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sunset-200"
                      title="Auto-calculated from player points (+3.5 per absent). Type to override."
                    >
                      Auto
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setOverride((o) => ({ ...o, [group.teamId]: null }))
                      }
                      className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-300 hover:bg-white/20"
                      title="Reset to the auto-calculated value"
                    >
                      Reset
                    </button>
                  )}
                </div>
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
                            value={rows[p.playerId].points}
                            onChange={(e) => setPoints(p.playerId, e.target.value)}
                            className="w-20 rounded-lg border border-white/10 bg-dusk-950 px-2 py-1.5 text-white outline-none focus:border-sunset-400"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            name={`status_${p.playerId}`}
                            value={rows[p.playerId].status}
                            onChange={(e) => setStatus(p.playerId, e.target.value)}
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
          );
        })}
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
          Team points auto-calculate from player points (+3.5 per absent). Type in
          a team box to override.
        </p>
        <button
          type="submit"
          className="rounded-lg bg-sunset-500 px-5 py-2.5 font-semibold text-white transition hover:bg-sunset-600"
        >
          Save week
        </button>
      </div>
    </form>
  );
}
