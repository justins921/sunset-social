"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/auth";
import {
  addIncome,
  addExpense,
  addFifty,
  removeFin,
  setOfficers,
} from "@/lib/queries";

function refresh() {
  revalidatePath("/admin/treasury");
  revalidatePath("/print/financial");
}

const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : 0;
};
const dateOf = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

export async function addIncomeAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const desc = String(formData.get("description") ?? "").trim();
  const amount = num(formData.get("amount"));
  if (desc && amount > 0) {
    await addIncome(
      dateOf(formData.get("date")),
      desc,
      amount,
      String(formData.get("category") ?? "other"),
    );
    refresh();
  }
  redirect("/admin/treasury");
}

export async function addExpenseAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const desc = String(formData.get("description") ?? "").trim();
  const amount = num(formData.get("amount"));
  if (desc && amount > 0) {
    await addExpense(
      dateOf(formData.get("date")),
      desc,
      amount,
      String(formData.get("checkNo") ?? "").trim() || null,
    );
    refresh();
  }
  redirect("/admin/treasury");
}

export async function addFiftyAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const amount = num(formData.get("amount"));
  if (amount > 0) {
    await addFifty(
      dateOf(formData.get("date")),
      String(formData.get("winner") ?? "").trim(),
      amount,
    );
    refresh();
  }
  redirect("/admin/treasury");
}

export async function removeFinAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const table = String(formData.get("table") ?? "") as "income" | "expense" | "fifty";
  const id = Number(formData.get("id"));
  if (["income", "expense", "fifty"].includes(table) && Number.isFinite(id)) {
    await removeFin(table, id);
    refresh();
  }
  redirect("/admin/treasury");
}

export async function saveOfficersAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  await setOfficers(
    String(formData.get("treasurer") ?? "").trim(),
    String(formData.get("verifier1") ?? "").trim(),
    String(formData.get("verifier2") ?? "").trim(),
  );
  refresh();
  redirect("/admin/treasury");
}
