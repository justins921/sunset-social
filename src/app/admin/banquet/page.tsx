import { redirect } from "next/navigation";
import Link from "next/link";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getBanquet } from "@/lib/queries";
import { BanquetEditor } from "./BanquetEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Banquet" };

export default async function BanquetAdmin() {
  if (!adminConfigured() || !isAuthed()) redirect("/admin/login");
  if (!hasDb()) redirect("/admin");
  const banquet = await getBanquet();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="text-sm text-slate-400 hover:text-sunset-300">
          ← Admin
        </Link>
        <span className="text-sm text-slate-400">Banquet {banquet.data.year}</span>
      </div>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Banquet script</h1>
      <p className="mt-1 text-sm text-slate-400">
        The year-end run-of-show. Awards fill in from the standings; everything else is
        yours to edit. Print a blank worksheet to fill winners in live, or a final copy.
      </p>
      <div className="mt-6">
        <BanquetEditor banquet={banquet} />
      </div>
    </div>
  );
}
