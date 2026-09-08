import { beginGoogleCalendarConnection } from "@/lib/calendar/repository";
import { authorizeRoute, unauthorizedResponse } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await authorizeRoute(request))) return unauthorizedResponse();
  try {
    const response = Response.redirect(beginGoogleCalendarConnection(), 307);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return Response.json({ message: "Google Calendar OAuth is not configured." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
