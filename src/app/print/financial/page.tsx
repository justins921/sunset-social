import { Fragment } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LEAGUE } from "@/data/league";
import { hasDb } from "@/lib/db";
import { getFinancials } from "@/lib/queries";
import { PrintButton } from "@/components/PrintButton";
import { FitToPage } from "@/components/FitToPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Financial Report" };

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function FinancialReport() {
  if (!hasDb()) redirect("/");
  const f = await getFinancials();
  if (!f) redirect("/");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 print:m-0 print:max-w-none print:p-0">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/admin/treasury" className="text-sm text-slate-400 hover:text-sunset-300">
          ← Treasury
        </Link>
        <PrintButton />
      </div>

      <FitToPage>
      <div className="print-sheet rounded-xl bg-white p-6 text-slate-900 shadow sm:p-8">
        <header className="border-b-2 border-slate-800 pb-3 text-center">
          <h1 className="text-xl font-bold">{LEAGUE.name}</h1>
          <p className="text-sm font-semibold tracking-wide text-slate-600">
            Financial Report · {LEAGUE.season}
          </p>
        </header>

        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          {/* Income */}
          <section>
            <h2 className="mb-1 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
              Income
            </h2>
            <table className="w-full text-xs">
              <tbody>
                {f.income.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 align-top">
                    <td className="py-1 pr-2">{r.description}</td>
                    <td className="whitespace-nowrap py-1 text-right font-mono">{money(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-400 font-semibold">
                  <td className="py-1">Income subtotal</td>
                  <td className="py-1 text-right font-mono">{money(f.incomeTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Expenses */}
          <section>
            <h2 className="mb-1 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
              Expenses / Purchases
            </h2>
            <table className="w-full text-xs">
              <tbody>
                {f.expenses.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="border-b border-slate-100 align-top">
                      <td className="py-1 pr-2">
                        {r.description}
                        {r.checkNo && <span className="ml-1 text-slate-500">({r.checkNo})</span>}
                      </td>
                      <td className="whitespace-nowrap py-1 text-right font-mono">{money(r.amount)}</td>
                    </tr>
                    {r.items.map((it) => (
                      <tr key={it.id} className="text-[10px] text-slate-500">
                        <td className="py-0.5 pl-3">↳ {it.description}</td>
                        <td className="whitespace-nowrap py-0.5 text-right font-mono">
                          {it.amount > 0 ? money(it.amount) : "—"}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-400 font-semibold">
                  <td className="py-1">Debit total</td>
                  <td className="py-1 text-right font-mono">{money(f.debitTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        </div>

        {/* 50/50 */}
        <section className="mt-6">
          <h2 className="mb-1 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
            50/50
          </h2>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <table className="w-full text-xs">
              <tbody>
                {f.fifty.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-1 pr-2 text-slate-500">{r.date}</td>
                    <td className="py-1 pr-2">{r.winner}</td>
                    <td className="whitespace-nowrap py-1 text-right font-mono">{money(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-end gap-x-4 text-xs">
            {f.drawingTotals.length > 1 &&
              f.drawingTotals.map((d) => (
                <span key={d.kind} className="text-slate-500">
                  {d.label}: <span className="font-mono">{money(d.total)}</span>
                </span>
              ))}
            <span className="font-semibold">
              Drawings subtotal: <span className="font-mono">{money(f.fiftyTotal)}</span>
            </span>
          </div>
        </section>

        {/* Totals */}
        <section className="mt-6 break-inside-avoid rounded-lg border border-slate-300 bg-slate-50 p-4">
          <dl className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Income Grand Total</dt>
              <dd className="font-mono font-semibold">{money(f.grandTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Minus Debit Total</dt>
              <dd className="font-mono">{money(f.debitTotal)}</dd>
            </div>
            <div className="flex justify-between border-t-2 border-slate-400 pt-1 text-base font-bold">
              <dt>Money on Hand</dt>
              <dd className="font-mono">{money(f.moneyOnHand)}</dd>
            </div>
          </dl>
        </section>

        {/* Signatures */}
        <section className="mt-10 grid grid-cols-3 gap-6 text-center text-xs">
          {f.officers.map((o, i) => (
            <div key={i}>
              <div className="mb-1 h-6 border-b border-slate-500" />
              <p className="font-medium">{o.name || " "}</p>
              <p className="text-slate-500">{o.title || " "}</p>
            </div>
          ))}
        </section>

        <p className="mt-6 text-xs text-slate-400">
          {LEAGUE.name} · Financial Report generated from the league website.
        </p>
      </div>
      </FitToPage>
    </div>
  );
}
