"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/auth";
import {
  saveRoster,
  addSub,
  updateSub,
  removeSub,
  startNewSeason,
  getRoster,
} from "@/lib/queries";

function refreshPublic() {
  revalidatePath("/");
  revalidatePath("/standings");
  revalidatePath("/teams");
  revalidatePath("/results");
}

export async function saveRosterAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");

  const roster = await getRoster();
  const teams = roster.teams.map((t) => ({
    id: t.id,
    name: String(formData.get(`teamname_${t.id}`) ?? t.name),
    players: t.players.map((p) => ({
      id: p.id,
      name: String(formData.get(`pname_${p.id}`) ?? p.name),
      phone: (String(formData.get(`pphone_${p.id}`) ?? "").trim() || null) as
        | string
        | null,
    })),
  }));
  await saveRoster({ teams });
  refreshPublic();
  redirect("/admin/roster?saved=1");
}

export async function addSubAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const name = String(formData.get("name") ?? "").trim();
  if (name) {
    await addSub(name, String(formData.get("phone") ?? "").trim() || null);
    refreshPublic();
  }
  redirect("/admin/roster");
}

export async function updateSubAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (Number.isFinite(id) && name) {
    await updateSub(id, name, String(formData.get("phone") ?? "").trim() || null);
    refreshPublic();
  }
  redirect("/admin/roster");
}

export async function removeSubAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  const id = Number(formData.get("id"));
  if (Number.isFinite(id)) {
    await removeSub(id);
    refreshPublic();
  }
  redirect("/admin/roster");
}

export async function startNewSeasonAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");
  if (String(formData.get("confirm") ?? "") !== "RESET") {
    redirect("/admin/roster?reset=confirm");
  }
  await startNewSeason();
  refreshPublic();
  redirect("/admin/roster?reset=done");
}
