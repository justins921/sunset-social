"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/auth";
import { addMeeting, saveMeeting, deleteMeeting } from "@/lib/queries";

export async function addMeetingAction() {
  if (!isAuthed()) redirect("/admin/login");
  const id = await addMeeting();
  revalidatePath("/minutes");
  redirect(`/admin/minutes/${id}`);
}

export async function saveMeetingAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) redirect("/admin/minutes");
  const attendeeIds = formData
    .getAll("present")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
  await saveMeeting(id, {
    date: String(formData.get("date") ?? "").trim() || null,
    title: String(formData.get("title") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim() || null,
    attendeeIds,
  });
  revalidatePath("/minutes");
  redirect(`/admin/minutes/${id}?saved=1`);
}

export async function deleteMeetingAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const id = Number(formData.get("id"));
  if (Number.isFinite(id)) await deleteMeeting(id);
  revalidatePath("/minutes");
  redirect("/admin/minutes");
}
