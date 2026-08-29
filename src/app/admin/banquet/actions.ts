"use server";

import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/auth";
import { saveBanquet } from "@/lib/queries";
import type { BanquetData } from "@/data/banquet2026";

export async function saveBanquetAction(payload: string) {
  if (!isAuthed()) throw new Error("Not authorized");
  let data: BanquetData;
  try {
    data = JSON.parse(payload) as BanquetData;
  } catch {
    throw new Error("Bad payload");
  }
  await saveBanquet(data);
  revalidatePath("/admin/banquet");
  revalidatePath("/print/banquet");
}
