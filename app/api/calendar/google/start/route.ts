import { beginGoogleCalendarConnection } from "@/lib/calendar/repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.redirect(beginGoogleCalendarConnection(), 307);
  } catch {
    return Response.json({ message: "Google Calendar OAuth is not configured." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
