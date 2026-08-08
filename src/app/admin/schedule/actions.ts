"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/auth";
import { saveWeek, addWeek, removeWeek, generateRoundRobin } from "@/lib/queries";

function refresh() {
  revalidatePath("/");
  revalidatePath("/schedule");
}

export async function saveWeekAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) redirect("/admin/schedule");
  const matchups = String(formData.get("matchups") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  await saveWeek(id, {
    date: String(formData.get("date") ?? "").trim() || null,
    label: String(formData.get("label") ?? "").trim() || "Week",
    note: String(formData.get("note") ?? "").trim() || null,
    matchups,
  });
  refresh();
  redirect("/admin/schedule?saved=1");
}

export async function addWeekAction() {
  if (!isAuthed()) redirect("/admin/login");
  await addWeek();
  refresh();
  redirect("/admin/schedule");
}

export async function removeWeekAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const id = Number(formData.get("id"));
  if (Number.isFinite(id)) {
    await removeWeek(id);
    refresh();
  }
  redirect("/admin/schedule");
}

export async function generateAction() {
  if (!isAuthed()) redirect("/admin/login");
  await generateRoundRobin();
  refresh();
  redirect("/admin/schedule?generated=1");
}
