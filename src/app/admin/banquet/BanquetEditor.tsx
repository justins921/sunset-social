"use client";

import { useState } from "react";
import type { Banquet } from "@/lib/queries";
import type { BanquetData, BanquetAwards } from "@/data/banquet2026";
import { saveBanquetAction } from "./actions";

const input =
  "w-full rounded-lg border border-line bg-page px-3 py-2 text-ink outline-none focus:border-sunset-400";
const label = "text-[11px] uppercase tracking-widest text-ink2";
const btn = "rounded-lg bg-surface2 px-3 py-1.5 text-sm text-ink hover:bg-surface2";
const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export function BanquetEditor({ banquet }: { banquet: Banquet }) {
  const [d, setD] = useState<BanquetData>(banquet.data);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const auto = d.awardsOverride === null;

  // Award values shown in the editor: the saved override, or the live computed
  // set as a starting point when auto is on.
  const awards: BanquetAwards = d.awardsOverride ?? banquet.computed;

  const set = <K extends keyof BanquetData>(k: K, v: BanquetData[K]) =>
    setD((p) => ({ ...p, [k]: v }));
  const setAward = (patch: Partial<BanquetAwards>) =>
    setD((p) => ({ ...p, awardsOverride: { ...awards, ...patch } }));

  async function onSave() {
    setSaving(true);
    setSaved(false);
    await saveBanquetAction(JSON.stringify(d));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-8 pb-24">
      {/* Header text */}
      <Section title="Opening & sponsor">
        <Field label="Welcome / call to order">
          <textarea className={`${input} h-24`} value={d.welcome} onChange={(e) => set("welcome", e.target.value)} />
        </Field>
        <Field label="Raffle intro">
          <textarea className={`${input} h-24`} value={d.raffleIntro} onChange={(e) => set("raffleIntro", e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Sponsor name">
            <input className={input} value={d.sponsorName} onChange={(e) => set("sponsorName", e.target.value)} />
          </Field>
        </div>
        <Field label="Sponsor thank-you">
          <textarea className={`${input} h-28`} value={d.sponsorIntro} onChange={(e) => set("sponsorIntro", e.target.value)} />
        </Field>
      </Section>

      {/* Door prizes */}
      <Section title="Door prizes" note="Draw order, item, and number of winners. Winner names are filled on the final-copy print.">
        <div className="space-y-2">
          {d.doorPrizes.map((p, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-line bg-surface/30 p-2">
              <span className="w-6 shrink-0 text-center text-xs text-ink3">{p.n}</span>
              <input
                className={`${input} flex-1`}
                placeholder="Prize item"
                value={p.item}
                onChange={(e) => {
                  const dp = [...d.doorPrizes];
                  dp[i] = { ...p, item: e.target.value };
                  set("doorPrizes", dp);
                }}
              />
              <label className="flex items-center gap-1 text-xs text-ink2">
                winners
                <input
                  type="number"
                  min={1}
                  className={`${input} w-16`}
                  value={p.count}
                  onChange={(e) => {
                    const count = Math.max(1, num(e.target.value));
                    const winners = Array.from({ length: count }, (_, k) => p.winners[k] ?? "");
                    const dp = [...d.doorPrizes];
                    dp[i] = { ...p, count, winners };
                    set("doorPrizes", dp);
                  }}
                />
              </label>
              <button type="button" className="px-2 text-ink3 hover:text-red-300" onClick={() => set("doorPrizes", d.doorPrizes.filter((_, k) => k !== i))}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={btn}
          onClick={() =>
            set("doorPrizes", [
              ...d.doorPrizes,
              { n: d.doorPrizes.length + 1, item: "", count: 1, winners: [""] },
            ])
          }
        >
          + Add prize
        </button>
      </Section>

      {/* Flight night */}
      <Section title="Flight Night winners">
        <div className="space-y-2">
          {d.flightNight.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={`${input} w-16`} placeholder="Flt" value={f.flight} onChange={(e) => editList("flightNight", i, { flight: e.target.value })} />
              <input className={`${input} flex-1`} placeholder="Name" value={f.name} onChange={(e) => editList("flightNight", i, { name: e.target.value })} />
              <input className={`${input} w-24`} placeholder="Net" value={f.net} onChange={(e) => editList("flightNight", i, { net: e.target.value })} />
              <button type="button" className="px-2 text-ink3 hover:text-red-300" onClick={() => set("flightNight", d.flightNight.filter((_, k) => k !== i))}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className={btn} onClick={() => set("flightNight", [...d.flightNight, { flight: "", name: "", net: "" }])}>+ Add flight</button>
      </Section>

      {/* Hole events */}
      <Section title="Hole 10–18 event winners">
        <div className="space-y-2">
          {d.holeEvents.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={`${input} w-40`} placeholder="Event / hole" value={h.label} onChange={(e) => editList("holeEvents", i, { label: e.target.value })} />
              <input className={`${input} flex-1`} placeholder="Winner" value={h.winner} onChange={(e) => editList("holeEvents", i, { winner: e.target.value })} />
              <button type="button" className="px-2 text-ink3 hover:text-red-300" onClick={() => set("holeEvents", d.holeEvents.filter((_, k) => k !== i))}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className={btn} onClick={() => set("holeEvents", [...d.holeEvents, { label: "", winner: "" }])}>+ Add event</button>
      </Section>

      {/* Awards */}
      <Section
        title="Awards"
        note="Pulled from the standings automatically. Turn off auto to hand-edit the winners printed in the booklet."
      >
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) =>
              set("awardsOverride", e.target.checked ? null : (banquet.computed as BanquetAwards))
            }
          />
          Auto-calculate from standings
          {auto && <span className="text-xs text-fairway-400">· live values shown below</span>}
        </label>

        <div className={auto ? "pointer-events-none opacity-60" : ""}>
          {/* League MVP */}
          <SubHead>League MVP</SubHead>
          {awards.leagueMvps.map((m, i) => (
            <div key={i} className="mb-1 flex items-center gap-2">
              <input className={`${input} flex-1`} placeholder="Name" value={m.name} onChange={(e) => editAwardArr("leagueMvps", i, { name: e.target.value })} />
              <input className={`${input} w-28`} placeholder="Team" value={m.teamName} onChange={(e) => editAwardArr("leagueMvps", i, { teamName: e.target.value })} />
              <input className={`${input} w-20`} placeholder="Pts" value={String(m.points)} onChange={(e) => editAwardArr("leagueMvps", i, { points: num(e.target.value) })} />
              {!auto && <button type="button" className="px-2 text-ink3 hover:text-red-300" onClick={() => setAward({ leagueMvps: awards.leagueMvps.filter((_, k) => k !== i) })}>✕</button>}
            </div>
          ))}
          {!auto && <button type="button" className={`${btn} mt-1`} onClick={() => setAward({ leagueMvps: [...awards.leagueMvps, { teamId: 0, teamName: "", name: "", points: 0 }] })}>+ Add MVP</button>}

          {/* Team MVPs */}
          <SubHead>Team MVPs</SubHead>
          {awards.teamMvps.map((m, i) => (
            <div key={i} className="mb-1 flex items-center gap-2">
              <input className={`${input} w-28`} placeholder="Team" value={m.teamName} onChange={(e) => editAwardArr("teamMvps", i, { teamName: e.target.value })} />
              <input className={`${input} flex-1`} placeholder="Name" value={m.name} onChange={(e) => editAwardArr("teamMvps", i, { name: e.target.value })} />
              <input className={`${input} w-20`} placeholder="Pts" value={String(m.points)} onChange={(e) => editAwardArr("teamMvps", i, { points: num(e.target.value) })} />
              {!auto && <button type="button" className="px-2 text-ink3 hover:text-red-300" onClick={() => setAward({ teamMvps: awards.teamMvps.filter((_, k) => k !== i) })}>✕</button>}
            </div>
          ))}
          {!auto && <button type="button" className={`${btn} mt-1`} onClick={() => setAward({ teamMvps: [...awards.teamMvps, { teamId: 0, teamName: "", name: "", points: 0 }] })}>+ Add team MVP</button>}

          {/* Places */}
          <SubHead>1st / 2nd / 3rd place</SubHead>
          {awards.placeWinners.map((pw, i) => (
            <div key={i} className="mb-2 rounded-lg border border-line bg-surface/30 p-2">
              <div className="flex items-center gap-2">
                <span className="w-10 text-center text-xs text-ink2">{pw.place === 1 ? "1st" : pw.place === 2 ? "2nd" : "3rd"}</span>
                <input className={`${input} w-28`} placeholder="Team" value={pw.teamName} onChange={(e) => editAwardArr("placeWinners", i, { teamName: e.target.value })} />
                <input className={`${input} w-24`} placeholder="Pts" value={String(pw.points)} onChange={(e) => editAwardArr("placeWinners", i, { points: num(e.target.value) })} />
              </div>
              <input
                className={`${input} mt-1`}
                placeholder="Players, comma-separated"
                value={pw.players.join(", ")}
                onChange={(e) => editAwardArr("placeWinners", i, { players: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            </div>
          ))}

          {/* Most improved */}
          <SubHead>Most Improved</SubHead>
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${input} flex-1`} placeholder="Name" value={awards.mostImproved?.name ?? ""} onChange={(e) => setAward({ mostImproved: { ...(awards.mostImproved ?? { teamId: 0, teamName: "", firstAvg: 0, secondAvg: 0 }), name: e.target.value } })} />
            <input className={`${input} w-28`} placeholder="Team" value={awards.mostImproved?.teamName ?? ""} onChange={(e) => setAward({ mostImproved: { ...(awards.mostImproved ?? { teamId: 0, name: "", firstAvg: 0, secondAvg: 0 }), teamName: e.target.value } })} />
            <input className={`${input} w-24`} placeholder="1st half" value={String(awards.mostImproved?.firstAvg ?? "")} onChange={(e) => setAward({ mostImproved: { ...(awards.mostImproved ?? { teamId: 0, teamName: "", name: "", secondAvg: 0 }), firstAvg: num(e.target.value) } })} />
            <input className={`${input} w-24`} placeholder="2nd half" value={String(awards.mostImproved?.secondAvg ?? "")} onChange={(e) => setAward({ mostImproved: { ...(awards.mostImproved ?? { teamId: 0, teamName: "", name: "", firstAvg: 0 }), secondAvg: num(e.target.value) } })} />
          </div>
        </div>
      </Section>

      {/* 50/50 + closing */}
      <Section title="50/50 & closing">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="50/50 amount"><input className={input} placeholder="$" value={d.fiftyFiftyAmount} onChange={(e) => set("fiftyFiftyAmount", e.target.value)} /></Field>
          <Field label="50/50 winner"><input className={input} value={d.fiftyFiftyWinner} onChange={(e) => set("fiftyFiftyWinner", e.target.value)} /></Field>
        </div>
        <Field label="Fall League note">
          <textarea className={`${input} h-24`} value={d.fallNote} onChange={(e) => set("fallNote", e.target.value)} />
        </Field>
        <Field label="Spring meeting">
          <input className={input} value={d.springMeeting} onChange={(e) => set("springMeeting", e.target.value)} />
        </Field>
      </Section>

      {/* Officer elections */}
      <Section title={`Officer elections (${d.electionSeason} season)`} note="The motion / second / aye script is generated from these names on the printout.">
        <Field label="Election season">
          <input className={`${input} w-32`} value={d.electionSeason} onChange={(e) => set("electionSeason", e.target.value)} />
        </Field>
        <div className="space-y-2">
          {d.officers.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={`${input} w-56`} placeholder="Office" value={o.office} onChange={(e) => editList("officers", i, { office: e.target.value })} />
              <input className={`${input} flex-1`} placeholder="Nominee" value={o.name} onChange={(e) => editList("officers", i, { name: e.target.value })} />
              <button type="button" className="px-2 text-ink3 hover:text-red-300" onClick={() => set("officers", d.officers.filter((_, k) => k !== i))}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className={btn} onClick={() => set("officers", [...d.officers, { office: "", name: "" }])}>+ Add office</button>
      </Section>

      {/* Save bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-page/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <a href="/print/banquet?mode=final" target="_blank" className="rounded-lg border border-line px-3 py-2 text-ink hover:bg-surface2">Print final copy ↗</a>
            <a href="/print/banquet?mode=worksheet" target="_blank" className="rounded-lg border border-line px-3 py-2 text-ink hover:bg-surface2">Print blank worksheet ↗</a>
          </div>
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-fairway-400">Saved</span>}
            <button type="button" disabled={saving} className="rounded-lg bg-sunset-500 px-5 py-2 font-semibold text-ink hover:bg-sunset-600 disabled:opacity-50" onClick={onSave}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ---- small helpers bound to state ----
  function editList<K extends "flightNight" | "holeEvents" | "officers">(
    key: K,
    i: number,
    patch: Partial<BanquetData[K][number]>,
  ) {
    const arr = [...(d[key] as BanquetData[K])];
    arr[i] = { ...arr[i], ...patch } as BanquetData[K][number];
    set(key, arr as BanquetData[K]);
  }
  function editAwardArr<K extends "leagueMvps" | "teamMvps" | "placeWinners">(
    key: K,
    i: number,
    patch: Partial<BanquetAwards[K][number]>,
  ) {
    const arr = [...(awards[key] as BanquetAwards[K])];
    arr[i] = { ...arr[i], ...patch } as BanquetAwards[K][number];
    setAward({ [key]: arr } as unknown as Partial<BanquetAwards>);
  }
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface/40 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {note && <p className="mt-0.5 text-xs text-ink2">{note}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
function Field({ label: l, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={label}>{l}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function SubHead({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1 mt-4 text-sm font-semibold text-accent">{children}</h3>;
}
