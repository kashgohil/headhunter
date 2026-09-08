import { completeGoogleCalendarConnection } from "@/lib/calendar/repository";
import { googleConfig } from "@/lib/calendar/google";

export const runtime = "nodejs";

function settingsUrl(request: Request, parameters: Record<string, string>) {
  let url: URL;
  try {
    url = new URL("/settings/calendar", googleConfig().redirectUri);
  } catch {
    url = new URL("/settings/calendar", request.url);
  }
  for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, value);
  return url;
}

function redirectToSettings(request: Request, parameters: Record<string, string>) {
  const response = Response.redirect(settingsUrl(request, parameters), 307);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams;
  const code = input.get("code");
  const state = input.get("state");
  if (input.get("error")) return redirectToSettings(request, { error: "Google Calendar access was not approved." });
  if (!code || !state) return redirectToSettings(request, { error: "Google returned an incomplete authorization response. Start again." });
  try {
    await completeGoogleCalendarConnection(code, state);
    return redirectToSettings(request, { connected: "1" });
  } catch (error) {
    const message = error instanceof Error && !/token|credential/i.test(error.message) ? error.message : "Google Calendar could not be connected. Start again.";
    return redirectToSettings(request, { error: message });
  }
}
