import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getWeekEntry } from "@/lib/queries";
import { WeekEntryForm } from "./WeekEntryForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Enter scores" };

export default async function WeekEntryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string };
}) {
  if (!adminConfigured() || !isAuthed()) redirect("/admin/login");
  if (!hasDb()) redirect("/admin");

  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const week = await getWeekEntry(id);
  if (!week) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-slate-400 hover:text-sunset-300">
        ← All weeks
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{week.label}</h1>
          {week.note && <p className="text-sm text-sunset-200">{week.note}</p>}
        </div>
      </div>

      {searchParams.saved === "1" && (
        <p className="mt-4 rounded-lg border border-fairway-500/40 bg-fairway-500/10 px-4 py-2.5 text-sm text-fairway-400">
          Saved. Public standings and results have been updated.
        </p>
      )}

      <WeekEntryForm week={week} />
    </div>
  );
}
