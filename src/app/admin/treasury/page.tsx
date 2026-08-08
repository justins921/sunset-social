import { redirect } from "next/navigation";
import Link from "next/link";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getTreasury } from "@/lib/queries";
import { toggleDuesAction, addTxnAction, removeTxnAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Treasury" };

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function TreasuryAdmin() {
  if (!adminConfigured() || !isAuthed()) redirect("/admin/login");
  if (!hasDb()) redirect("/admin");
  const t = await getTreasury();
  if (!t) redirect("/admin");

  const input =
    "rounded-lg border border-white/10 bg-dusk-950 px-3 py-2 text-white outline-none focus:border-sunset-400";
  const paidCount = t.dues.filter((d) => d.paid).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-slate-400 hover:text-sunset-300">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Treasury</h1>

      {/* Summary */}
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Balance", value: money(t.balance), accent: true },
          { label: "Dues collected", value: money(t.duesCollected) },
          { label: "Other income", value: money(t.otherIncome) },
          { label: "Expenses", value: money(t.expenses) },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-dusk-800/40 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-400">{c.label}</p>
            <p className={`mt-1 text-xl font-semibold ${c.accent ? "text-sunset-200" : "text-white"}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Dues */}
      <div className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Dues ({money(t.memberFee)} / member)</h2>
          <p className="text-sm text-slate-400">
            {paidCount}/{t.dues.length} paid · {money(t.duesOutstanding)} outstanding
          </p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {t.dues.map((d) => (
            <form
              key={d.playerId}
              action={toggleDuesAction}
              className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${
                d.paid
                  ? "border-fairway-500/40 bg-fairway-500/10"
                  : "border-white/10 bg-dusk-800/40"
              }`}
            >
              <input type="hidden" name="playerId" value={d.playerId} />
              <input type="hidden" name="paid" value={d.paid ? "0" : "1"} />
              <span>
                <span className="font-medium">{d.name}</span>
                <span className="ml-2 text-xs text-slate-500">{d.teamName}</span>
              </span>
              <button
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                  d.paid
                    ? "bg-fairway-500/20 text-fairway-400"
                    : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                {d.paid ? "Paid ✓" : "Mark paid"}
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* Ledger */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold">Ledger</h2>
        <form action={addTxnAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="date" name="occurredOn" className={`${input} w-40`} />
          <input name="description" placeholder="Description" className={`${input} flex-1`} />
          <select name="kind" className={input} defaultValue="expense">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            className={`${input} w-28`}
          />
          <button className="rounded-lg bg-sunset-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sunset-600">
            Add
          </button>
        </form>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {t.transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-slate-500">
                    No entries yet.
                  </td>
                </tr>
              ) : (
                t.transactions.map((x) => (
                  <tr key={x.id}>
                    <td className="px-4 py-2 text-slate-400">{x.occurredOn}</td>
                    <td className="px-4 py-2">{x.description}</td>
                    <td
                      className={`px-4 py-2 text-right font-mono ${
                        x.kind === "income" ? "text-fairway-400" : "text-red-300"
                      }`}
                    >
                      {x.kind === "income" ? "+" : "−"}
                      {money(x.amount)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <form action={removeTxnAction}>
                        <input type="hidden" name="id" value={x.id} />
                        <button className="text-xs text-slate-500 hover:text-red-300">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Balance = dues collected + other income − expenses. Use this as the
          post-banquet treasury report.
        </p>
      </div>
    </div>
  );
}
