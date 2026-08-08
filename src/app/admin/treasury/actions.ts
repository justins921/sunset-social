"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/auth";
import { setDuesPaid, addTransaction, removeTransaction } from "@/lib/queries";

export async function toggleDuesAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const playerId = Number(formData.get("playerId"));
  const paid = String(formData.get("paid") ?? "") === "1";
  if (Number.isFinite(playerId)) await setDuesPaid(playerId, paid);
  revalidatePath("/admin/treasury");
  redirect("/admin/treasury");
}

export async function addTxnAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const desc = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const kind = String(formData.get("kind") ?? "expense");
  if (desc && Number.isFinite(amount) && amount !== 0) {
    await addTransaction(
      String(formData.get("occurredOn") ?? "").trim(),
      desc,
      amount,
      kind === "income" ? "income" : "expense",
    );
  }
  revalidatePath("/admin/treasury");
  redirect("/admin/treasury");
}

export async function removeTxnAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const id = Number(formData.get("id"));
  if (Number.isFinite(id)) await removeTransaction(id);
  revalidatePath("/admin/treasury");
  redirect("/admin/treasury");
}
