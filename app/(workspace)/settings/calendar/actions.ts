"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/action-form";
import { disconnectGoogleCalendar, linkEventToInterview, linkEventToOpportunity, selectCalendars, syncGoogleCalendar } from "@/lib/calendar/repository";

function refreshCalendarSurfaces(interviewId?: string) {
  revalidatePath("/settings/calendar");
  revalidatePath("/interviews");
  if (interviewId) revalidatePath(`/interviews/${interviewId}`);
  revalidatePath("/");
  revalidatePath("/notifications");
}

export async function selectCalendarsAction(_state: FormState, form: FormData): Promise<FormState> {
  try {
    await selectCalendars(form.getAll("calendarIds").map(String));
    refreshCalendarSurfaces();
    return { success: true, message: "Calendar selection saved. Sync to refresh candidate events." };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Calendar selection could not be saved." };
  }
}

export async function syncCalendarAction(): Promise<FormState> {
  try {
    const count = await syncGoogleCalendar();
    refreshCalendarSurfaces();
    return { success: true, message: `Sync complete. ${count} event ${count === 1 ? "record" : "records"} received.` };
  } catch (error) {
    refreshCalendarSurfaces();
    return { message: error instanceof Error ? error.message : "Calendar sync failed. Existing records were kept." };
  }
}

export async function linkExistingRoundAction(_state: FormState, form: FormData): Promise<FormState> {
  const eventId = String(form.get("eventId") ?? "");
  const interviewId = String(form.get("interviewId") ?? "");
  try {
    linkEventToInterview(eventId, interviewId);
    refreshCalendarSurfaces(interviewId);
    return { success: true, message: "Calendar event linked to the interview round." };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "The event could not be linked." };
  }
}

export async function linkOpportunityAction(_state: FormState, form: FormData): Promise<FormState> {
  const eventId = String(form.get("eventId") ?? "");
  const jobId = String(form.get("jobId") ?? "");
  try {
    const interviewId = linkEventToOpportunity(eventId, jobId);
    refreshCalendarSurfaces(interviewId);
    return { success: true, message: "A linked interview round was created for this opportunity." };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "The event could not be linked." };
  }
}

export async function disconnectCalendarAction(): Promise<FormState> {
  const result = await disconnectGoogleCalendar();
  refreshCalendarSurfaces();
  return {
    success: true,
    message: result.revoked
      ? "Google Calendar disconnected. Cached events and credentials were removed; interview records and notes remain."
      : "Local calendar data and credentials were removed. Google did not confirm revocation, so revoke Headhunter in your Google Account as well.",
  };
}
