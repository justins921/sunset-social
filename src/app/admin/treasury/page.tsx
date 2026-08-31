import { redirect } from "next/navigation";
import Link from "next/link";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getFinancials, DRAWING_KINDS, drawingLabel } from "@/lib/queries";
import {
  addIncomeAction,
  addExpenseAction,
  addExpenseItemAction,
  removeExpenseItemAction,
  addFiftyAction,
  removeFinAction,
  saveOfficersAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Treasury" };

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const input =
  "rounded-lg border border-line bg-page px-3 py-2 text-ink outline-none focus:border-sunset-400";

function RemoveBtn({ table, id }: { table: string; id: number }) {
  return (
    <form action={removeFinAction}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-ink3 hover:text-red-300">✕</button>
    </form>
  );
}

export default async function TreasuryAdmin() {
  if (!adminConfigured() || !isAuthed()) redirect("/admin/login");
  if (!hasDb()) redirect("/admin");
  const f = await getFinancials();
  if (!f) redirect("/admin");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="text-sm text-ink2 hover:text-accent">
          ← Admin
        </Link>
        <Link
          href="/print/financial"
          className="rounded-lg bg-sunset-500 px-4 py-2 text-sm font-semibold text-ink hover:bg-sunset-600"
        >
          Financial Report →
        </Link>
      </div>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Treasury</h1>

      {/* Summary */}
      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {[
          { label: "50/50 total", value: money(f.fiftyTotal) },
          { label: "Income", value: money(f.incomeTotal) },
          { label: "Grand total", value: money(f.grandTotal) },
          { label: "Debit total", value: money(f.debitTotal) },
          { label: "Money on hand", value: money(f.moneyOnHand), accent: true },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-surface/40 p-3">
            <p className="text-[11px] uppercase tracking-widest text-ink2">{c.label}</p>
            <p className={`mt-1 text-lg font-semibold ${c.accent ? "text-accent" : "text-ink"}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Income */}
        <section>
          <h2 className="text-lg font-semibold">Income</h2>
          <form action={addIncomeAction} className="mt-2 flex flex-wrap items-end gap-2">
            <input type="date" name="date" className={`${input} w-36`} />
            <input name="description" placeholder="Description" className={`${input} flex-1`} />
            <select name="category" defaultValue="dues" className={input}>
              <option value="banquet">Banquet</option>
              <option value="dues">Dues</option>
              <option value="fnr">FNR</option>
              <option value="other">Other</option>
            </select>
            <input name="amount" placeholder="$" inputMode="decimal" className={`${input} w-24`} />
            <button className="rounded-lg bg-surface2 px-3 py-2 text-sm text-ink hover:bg-surface2">Add</button>
          </form>
          <ul className="mt-3 divide-y divide-line text-sm">
            {f.income.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{r.description}</span>
                  {r.category && <span className="text-xs text-ink3">{r.category}</span>}
                </span>
                <span className="font-mono text-fairway-400">{money(r.amount)}</span>
                <RemoveBtn table="income" id={r.id} />
              </li>
            ))}
          </ul>
        </section>

        {/* Expenses */}
        <section>
          <h2 className="text-lg font-semibold">Expenses / Purchases</h2>
          <form action={addExpenseAction} className="mt-2 flex flex-wrap items-end gap-2">
            <input type="date" name="date" className={`${input} w-36`} />
            <input name="description" placeholder="Description" className={`${input} flex-1`} />
            <input name="checkNo" placeholder="CK#" className={`${input} w-24`} />
            <input name="amount" placeholder="$" inputMode="decimal" className={`${input} w-24`} />
            <button className="rounded-lg bg-surface2 px-3 py-2 text-sm text-ink hover:bg-surface2">Add</button>
          </form>
          <ul className="mt-3 divide-y divide-line text-sm">
            {f.expenses.map((r) => {
              const itemSum = r.items.reduce((s, it) => s + it.amount, 0);
              const mismatch = r.items.length > 0 && Math.abs(itemSum - r.amount) > 0.005;
              return (
                <li key={r.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{r.description}</span>
                      {r.checkNo && <span className="text-xs text-ink3">{r.checkNo}</span>}
                    </span>
                    <span className="font-mono text-red-300">{money(r.amount)}</span>
                    <RemoveBtn table="expense" id={r.id} />
                  </div>
                  {/* Itemized receipt lines */}
                  {r.items.length > 0 && (
                    <ul className="ml-3 mt-1 border-l border-line pl-3 text-xs">
                      {r.items.map((it) => (
                        <li key={it.id} className="flex items-center justify-between gap-2 py-0.5 text-ink2">
                          <span className="min-w-0 flex-1 truncate">{it.description}</span>
                          <span className="font-mono text-ink2">{money(it.amount)}</span>
                          <form action={removeExpenseItemAction}>
                            <input type="hidden" name="id" value={it.id} />
                            <button className="text-ink3 hover:text-red-300">✕</button>
                          </form>
                        </li>
                      ))}
                      <li className={`flex justify-between pt-0.5 font-mono ${mismatch ? "text-amber-300" : "text-ink3"}`}>
                        <span>items subtotal{mismatch ? " (≠ total)" : ""}</span>
                        <span>{money(itemSum)}</span>
                      </li>
                    </ul>
                  )}
                  {/* Add an item to this expense */}
                  <form action={addExpenseItemAction} className="ml-3 mt-1 flex items-center gap-1 pl-3">
                    <input type="hidden" name="expenseId" value={r.id} />
                    <input name="description" placeholder="+ itemize (e.g. prize)" className={`${input} h-8 flex-1 py-1 text-xs`} />
                    <input name="amount" placeholder="$" inputMode="decimal" className={`${input} h-8 w-20 py-1 text-xs`} />
                    <button className="rounded-lg bg-surface2 px-2 py-1 text-xs text-ink hover:bg-surface2">Add</button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Drawings */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Drawings log</h2>
        <p className="mt-1 text-xs text-ink2">
          The weekly 50/50 plus the Fun Night $100 and $50 drawings — tracked separately.
        </p>
        {/* Per-kind money brought in */}
        {f.drawingTotals.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {f.drawingTotals.map((d) => (
              <div key={d.kind} className="rounded-xl border border-line bg-surface/40 p-2">
                <p className="text-[11px] uppercase tracking-widest text-ink2">{d.label}</p>
                <p className="mt-0.5 font-mono text-ink">{money(d.total)}</p>
              </div>
            ))}
          </div>
        )}
        <form action={addFiftyAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="date" name="date" className={`${input} w-36`} />
          <select name="kind" defaultValue="50/50" className={input}>
            {DRAWING_KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <input name="winner" placeholder="Winner(s)" className={`${input} flex-1`} />
          <input name="amount" placeholder="$" inputMode="decimal" className={`${input} w-24`} />
          <button className="rounded-lg bg-surface2 px-3 py-2 text-sm text-ink hover:bg-surface2">Add</button>
        </form>
        <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
          {f.fifty.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 border-b border-line py-1.5 text-sm">
              <span className="w-20 shrink-0 text-ink2">{r.date}</span>
              {r.kind !== "50/50" && (
                <span className="shrink-0 rounded bg-sunset-500/20 px-1.5 py-0.5 text-[10px] text-accent">
                  {drawingLabel(r.kind)}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{r.winner}</span>
              <span className="font-mono">{money(r.amount)}</span>
              <RemoveBtn table="fifty" id={r.id} />
            </li>
          ))}
        </ul>
      </section>

      {/* Officers */}
      <section className="mt-10 rounded-2xl border border-line bg-surface/40 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
          Report signatures
        </h2>
        <p className="mt-1 text-xs text-ink2">
          The three names and titles printed on the Financial Report signature lines.
        </p>
        <form action={saveOfficersAction} className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <input
                name={`name${i + 1}`}
                defaultValue={f.officers[i]?.name ?? ""}
                placeholder={`Officer ${i + 1} name`}
                className={`${input} flex-1`}
              />
              <input
                name={`title${i + 1}`}
                defaultValue={f.officers[i]?.title ?? ""}
                placeholder="Title (e.g. President)"
                className={`${input} flex-1`}
              />
            </div>
          ))}
          <button className="rounded-lg bg-surface2 px-4 py-2 text-sm text-ink hover:bg-surface2">Save</button>
        </form>
      </section>

      <p className="mt-6 text-xs text-ink3">
        Grand total = income + 50/50. Money on hand = grand total − debit total.
        Enter dues as income lines. Use <span className="text-ink2">Financial Report</span> to print/email the balance sheet.
      </p>
    </div>
  );
}
