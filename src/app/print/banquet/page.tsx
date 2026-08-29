import { redirect } from "next/navigation";
import Link from "next/link";
import { LEAGUE } from "@/data/league";
import { hasDb } from "@/lib/db";
import { getBanquet } from "@/lib/queries";
import { PrintButton } from "@/components/PrintButton";
import type { BanquetAwards } from "@/data/banquet2026";

export const dynamic = "force-dynamic";
export const metadata = { title: "Banquet Agenda" };

const WORDS = [
  "ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
  "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
  "SEVENTEEN", "EIGHTEEN", "NINETEEN", "TWENTY",
];
function word(n: number): string {
  if (n <= 20) return WORDS[n];
  if (n < 30) return `TWENTY${WORDS[n - 20]}`;
  if (n < 40) return `THIRTY${n === 30 ? "" : WORDS[n - 30]}`;
  return String(n);
}

// A winner slot: the typed name on a final copy, a blank line on a worksheet.
function Line({ value, worksheet }: { value: string; worksheet: boolean }) {
  const show = !worksheet && value.trim();
  return (
    <span className="ml-6 inline-block min-w-[16rem] border-b border-slate-400 pb-0.5 align-baseline">
      {show ? value : " "}
    </span>
  );
}

export default async function BanquetAgenda({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  if (!hasDb()) redirect("/");
  const { data: d, awards } = await getBanquet();
  const worksheet = searchParams.mode === "worksheet";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 print:m-0 print:max-w-none print:p-0">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/banquet" className="text-sm text-slate-400 hover:text-sunset-300">
          ← Banquet
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/print/banquet?mode=final"
            className={`rounded-lg px-3 py-1.5 ${!worksheet ? "bg-sunset-500 text-white" : "border border-white/10 text-slate-300"}`}
          >
            Final copy
          </Link>
          <Link
            href="/print/banquet?mode=worksheet"
            className={`rounded-lg px-3 py-1.5 ${worksheet ? "bg-sunset-500 text-white" : "border border-white/10 text-slate-300"}`}
          >
            Blank worksheet
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="print-sheet space-y-5 rounded-xl bg-white p-6 text-slate-900 shadow sm:p-10">
        {/* Cover */}
        <header className="border-b-2 border-slate-800 pb-4 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-wide">{LEAGUE.name}</h1>
          <p className="mt-1 text-lg font-semibold tracking-wide text-slate-600">
            Banquet Celebration {d.year}
          </p>
          {worksheet && (
            <p className="mt-1 text-xs uppercase tracking-widest text-slate-400">Worksheet</p>
          )}
        </header>

        {/* Welcome */}
        <p className="text-sm leading-relaxed">{d.welcome}</p>
        <p className="text-sm leading-relaxed">{d.raffleIntro}</p>

        {/* Sponsor + door prizes */}
        <Divider>Door Prizes</Divider>
        <p className="text-sm leading-relaxed">{d.sponsorIntro}</p>
        <p className="text-sm font-semibold">Now let&rsquo;s begin with the door prizes. First, we will start with:</p>
        <ol className="space-y-2 text-sm">
          {d.doorPrizes.map((p) => (
            <li key={p.n} className="break-inside-avoid">
              <span className="font-bold">{word(p.n)}:</span>{" "}
              <span className="text-slate-700">{p.item || " "}</span>
              <div className="mt-1 space-y-1">
                {Array.from({ length: p.count }).map((_, k) => (
                  <div key={k} className="flex items-baseline text-sm">
                    <span className="w-5 text-right text-slate-400">{k + 1}.</span>
                    <Line value={p.winners[k] ?? ""} worksheet={worksheet} />
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>

        {/* Flight night */}
        <Divider>Flight Night Winners</Divider>
        <table className="text-sm">
          <tbody>
            {d.flightNight.map((f, i) => (
              <tr key={i}>
                <td className="py-1 pr-3 font-bold">&ldquo;{f.flight}&rdquo;</td>
                <td className="py-1 pr-3">
                  {worksheet ? <Blank /> : f.name || <Blank />}
                </td>
                <td className="py-1 text-slate-600">Net {worksheet ? "___" : f.net || "___"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Hole events */}
        {d.holeEvents.length > 0 && (
          <>
            <Divider>Event Winners — Holes 10&ndash;18</Divider>
            <table className="text-sm">
              <tbody>
                {d.holeEvents.map((h, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-4 font-semibold">{h.label}</td>
                    <td className="py-1">{worksheet ? <Blank /> : h.winner || <Blank />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Awards */}
        <Awards d={d} awards={awards} />

        {/* 50/50 */}
        <Divider>50/50</Divider>
        <p className="text-sm">
          The 50/50 winner goes home with{" "}
          <strong>${worksheet ? "______" : d.fiftyFiftyAmount || "______"}</strong> — and the
          winner is:{" "}
          {worksheet ? <Blank /> : d.fiftyFiftyWinner || <Blank />}
        </p>

        {/* Officer elections */}
        <Divider>Election of Officers — {d.electionSeason} Season</Divider>
        <p className="text-sm">
          This concludes the banquet festivities. Now it&rsquo;s time for nominations of league
          officers for the {d.electionSeason} season.
        </p>
        <div className="space-y-4 text-sm">
          {d.officers.map((o, i) => {
            const OFFICE = o.office.toUpperCase();
            const NAME = (o.name || "____________").toUpperCase();
            return (
              <div key={i} className="leading-relaxed">
                <p>I NEED A MOTION FOR {OFFICE}.</p>
                <p>IS THERE A SECOND?</p>
                <p>ALL IN FAVOR OF {NAME} FOR {OFFICE} SAY AYE — ALL OPPOSED.</p>
                <p>THE AYES HAVE IT, AND {NAME} IS THE NEW {OFFICE}.</p>
              </div>
            );
          })}
        </div>

        {/* Closing */}
        <Divider>Closing</Divider>
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">Final Note:</span> {d.fallNote}
        </p>
        <p className="text-sm leading-relaxed">
          If no objection, I hereby adjourn this meeting. See you all at our spring meeting on{" "}
          <strong>{d.springMeeting}</strong>.
        </p>

        <p className="pt-4 text-xs text-slate-400">
          {LEAGUE.name} · Banquet agenda generated from the league website.
        </p>
      </div>
    </div>
  );
}

function Blank() {
  return <span className="inline-block min-w-[12rem] border-b border-slate-400">&nbsp;</span>;
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-6 border-b-2 border-slate-700 pb-1 text-base font-bold uppercase tracking-wide break-after-avoid">
      {children}
    </h2>
  );
}

function Awards({
  d,
  awards,
}: {
  d: { mvpAwardName: string; improvedAwardName: string; championAwardName: string };
  awards: BanquetAwards;
}) {
  const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return (
    <>
      {/* Team MVPs */}
      {awards.teamMvps.length > 0 && (
        <>
          <Divider>Individual Team MVPs</Divider>
          <table className="text-sm">
            <tbody>
              {awards.teamMvps.map((m, i) => (
                <tr key={i}>
                  <td className="py-1 pr-3 font-semibold">{m.teamName}:</td>
                  <td className="py-1 pr-3 text-slate-600">With {num(m.points)} points</td>
                  <td className="py-1">{m.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* League MVP */}
      {awards.leagueMvps.length > 0 && (
        <>
          <Divider>{d.mvpAwardName}</Divider>
          <p className="text-sm">
            {awards.leagueMvps.length > 1
              ? `We have ${awards.leagueMvps.length === 2 ? "two" : awards.leagueMvps.length} MVPs this year:`
              : "The League MVP this year:"}
          </p>
          <ul className="ml-1 text-sm">
            {awards.leagueMvps.map((m, i) => (
              <li key={i} className="py-0.5">
                From {m.teamName}, with a total of {num(m.points)} points:{" "}
                <strong>{m.name}</strong>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Places */}
      {awards.placeWinners.length > 0 && (
        <>
          <Divider>Third, Second &amp; First Place</Divider>
          <div className="space-y-2 text-sm">
            {[...awards.placeWinners]
              .sort((a, b) => b.place - a.place)
              .map((pw) => {
                const ord = pw.place === 1 ? "1st" : pw.place === 2 ? "2nd" : `${pw.place}rd`;
                return (
                  <div key={pw.place}>
                    <p>
                      <span className="font-bold">{ord} Place:</span> with a total of{" "}
                      {num(pw.points)} points is {pw.teamName}
                      {pw.place === 1 && (
                        <> — winner of the {d.championAwardName}</>
                      )}
                      :
                    </p>
                    <p className="ml-6 text-slate-700">{pw.players.join(" – ")}</p>
                  </div>
                );
              })}
          </div>
        </>
      )}

      {/* Most improved */}
      {awards.mostImproved && (
        <>
          <Divider>{d.improvedAwardName}</Divider>
          <p className="text-sm">
            Comes from {awards.mostImproved.teamName}:{" "}
            <strong>{awards.mostImproved.name}</strong>. Started with a first-half average of{" "}
            {num(awards.mostImproved.firstAvg)} and ended the season averaging{" "}
            {num(awards.mostImproved.secondAvg)} — that&rsquo;s{" "}
            {num(awards.mostImproved.firstAvg - awards.mostImproved.secondAvg)} fewer strokes.
          </p>
        </>
      )}
    </>
  );
}
