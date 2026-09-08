"use server";

import { requireOwner } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { startWeeklyReview } from "@/lib/weekly-review/repository";
import { saveReviewEdits } from "@/lib/weekly-review/storage";
import { sqlite } from "@/lib/db";
export type ReviewFormState = {
  message?: string;
  success?: boolean;
  revision?: number;
};
export async function createReviewAction(
  _state: ReviewFormState,
  data: FormData,
): Promise<ReviewFormState> {
  await requireOwner();
  let id: string;
  try {
    id = await startWeeklyReview(String(data.get("weekStart") ?? ""));
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Could not create this review. Try again.",
    };
  }
  revalidatePath("/reviews");
  redirect(`/reviews/${id}`);
}
export async function saveReviewAction(
  id: string,
  _state: ReviewFormState,
  data: FormData,
): Promise<ReviewFormState> {
  await requireOwner();
  let revision: number;
  try {
    revision = saveReviewEdits(
      sqlite,
      id,
      Number(data.get("revision")),
      Object.fromEntries(data),
    );
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "The review could not be saved. Your notes are still here; try again.",
      revision: _state.revision,
    };
  }
  revalidatePath(`/reviews/${id}`);
  revalidatePath("/reviews");
  revalidatePath("/search");
  return {
    success: true,
    message:
      data.get("status") === "reviewed"
        ? "Review completed. Your snapshot and plan are saved."
        : "Draft saved.",
    revision,
  };
}
