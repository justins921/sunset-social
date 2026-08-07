"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  checkPassword,
  startSession,
  endSession,
  isAuthed,
  adminConfigured,
} from "@/lib/auth";
import {
  saveWeekResults,
  saveRecap,
  saveTeamPoints,
  type ResultInput,
} from "@/lib/queries";

export async function loginAction(formData: FormData) {
  if (!adminConfigured()) redirect("/admin/login?e=unconfigured");
  const pw = String(formData.get("password") ?? "");
  if (!checkPassword(pw)) redirect("/admin/login?e=bad");
  startSession();
  redirect("/admin");
}

export async function logoutAction() {
  endSession();
  redirect("/admin/login");
}

function parseNumber(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function saveWeekAction(formData: FormData) {
  if (!isAuthed()) redirect("/admin/login");

  const weekId = Number(formData.get("weekId"));
  if (!Number.isFinite(weekId)) redirect("/admin");

  const ids = formData.getAll("playerId").map((v) => Number(v));
  const entries: ResultInput[] = ids.map((pid) => {
    const strokes = parseNumber(formData.get(`strokes_${pid}`));
    const points = parseNumber(formData.get(`points_${pid}`));
    const status = String(formData.get(`status_${pid}`) ?? "played");
    return {
      playerId: pid,
      strokes: strokes === null ? null : Math.round(strokes),
      points,
      status,
    };
  });

  await saveWeekResults(weekId, entries);

  const teamIds = formData.getAll("teamId").map((v) => Number(v));
  const teamPoints = teamIds.map((tid) => ({
    teamId: tid,
    points: parseNumber(formData.get(`teampts_${tid}`)),
  }));
  await saveTeamPoints(weekId, teamPoints);

  const low = String(formData.get("lowScores") ?? "").trim() || null;
  const fifty = String(formData.get("fiftyFifty") ?? "").trim() || null;
  await saveRecap(weekId, low, fifty);

  // Refresh the public pages that read from these tables.
  revalidatePath("/");
  revalidatePath("/standings");
  revalidatePath("/results");
  revalidatePath("/teams");

  redirect(`/admin/week/${weekId}?saved=1`);
}
