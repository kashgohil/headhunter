import Link from "next/link";
import { connection } from "next/server";
import { getCommandCenter } from "@/lib/command-center/repository";
import { getNotificationPreferences } from "@/lib/notifications/repository";
import {
  eventLabels,
  notificationReason,
  urgency,
  isQuietTime,
} from "@/lib/notifications/preferences";
import { ActionForm, FormSelect } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertControls } from "@/app/(workspace)/command-center/alert-controls";
import { savePreferences } from "./actions";
export const metadata = { title: "Notifications" };
function dueTime(alert: { kind: string; dueAt: string | null }, timeZone: string) {
  if (!alert.dueAt) return null;
  return new Intl.DateTimeFormat("en", alert.kind === "interview"
    ? { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short" }
    : { year: "numeric", month: "short", day: "numeric", timeZone })
    .format(new Date(alert.dueAt));
}
export default async function NotificationsPage() {
  await connection();
  const overview = await getCommandCenter();
  const preferences = getNotificationPreferences();
  const delivered = overview.visible.filter(
    (alert) => !notificationReason(alert, preferences, overview.now),
  );
  const held = overview.visible.filter((alert) =>
    notificationReason(alert, preferences, overview.now),
  );
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Reminders from your workspace, updated when you visit or refresh. Urgent
        means overdue or due within 24 hours; upcoming means within seven days.
      </p>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <section aria-label="Notification inbox">
          <h2 className="text-lg font-semibold">
            Your inbox · {delivered.length}
          </h2>
          {isQuietTime(preferences, overview.now) ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Quiet hours are active in {preferences.timeZone}. Held reminders
              return when quiet hours end.
            </p>
          ) : null}
          {!delivered.length ? (
            <p className="mt-6 rounded-lg border p-6 text-sm text-muted-foreground">
              No notifications to show. Your preferences and resolved reminders
              may affect this list.{" "}
              <Link href="/" className="underline">
                Open command center
              </Link>
              .
            </p>
          ) : null}
          <div className="mt-4 divide-y">
            {delivered.map((alert) => (
              <article key={alert.key} className="py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={alert.href}
                    className="font-medium hover:underline"
                  >
                    {alert.title}
                  </Link>
                  <Badge variant="outline">
                    {urgency(alert, overview.now)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {alert.source}
                </p>
                {dueTime(alert, preferences.timeZone) ? <time dateTime={alert.dueAt!} className="mt-2 block font-mono text-xs">{dueTime(alert, preferences.timeZone)}</time> : null}
                <p className="mt-2 text-sm leading-6">{alert.reason}</p>
                <div className="mt-3">
                  <AlertControls alertKey={alert.key} />
                </div>
              </article>
            ))}
          </div>
          {held.length ? (
            <details className="mt-6 rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Held by preferences · {held.length}
              </summary>
              <ul className="mt-4 space-y-4">
                {held.map((alert) => (
                  <li key={alert.key} className="text-sm">
                    <Link href={alert.href} className="underline">
                      {alert.title} · {alert.source}
                    </Link>
                    <p className="mt-1 text-muted-foreground">
                      {notificationReason(alert, preferences, overview.now)}
                    </p>
                    {dueTime(alert, preferences.timeZone) ? <time dateTime={alert.dueAt!} className="mt-1 block font-mono text-xs text-muted-foreground">{dueTime(alert, preferences.timeZone)}</time> : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {overview.hidden.length ? (
            <details className="mt-4 rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Snoozed or dismissed · {overview.hidden.length}
              </summary>
              <ul className="mt-4 space-y-4">
                {overview.hidden.map((alert) => (
                  <li key={alert.key} className="space-y-2 text-sm">
                    <Link href={alert.href} className="underline">
                      {alert.title} · {alert.source}
                    </Link>
                    <p className="text-muted-foreground">
                      {alert.hiddenReason}
                    </p>
                    {dueTime(alert, preferences.timeZone) ? <time dateTime={alert.dueAt!} className="font-mono text-xs text-muted-foreground">{dueTime(alert, preferences.timeZone)}</time> : null}
                    <AlertControls alertKey={alert.key} hidden />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
        <section className="rounded-xl border p-5 lg:self-start">
          <h2 className="mb-5 text-lg font-semibold">Delivery preferences</h2>
          <ActionForm
            action={savePreferences}
            label="Save preferences"
            preserveInput
          >
            <label className="flex items-center gap-3 text-sm">
              <Checkbox name="enabled" defaultChecked={preferences.enabled} />
              Enable in-app notifications
            </label>
            <fieldset className="space-y-3">
              <legend className="mb-3 text-sm font-medium">Event types</legend>
              {Object.entries(eventLabels).map(([kind, label]) => (
                <label key={kind} className="flex items-center gap-3 text-sm">
                  <Checkbox
                    name="eventKinds"
                    value={kind}
                    defaultChecked={preferences.eventKinds.includes(
                      kind as keyof typeof eventLabels,
                    )}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <FormSelect
              name="minimumUrgency"
              label="Minimum urgency"
              defaultValue={preferences.minimumUrgency}
              options={[
                { value: "all", label: "All reminders" },
                { value: "upcoming", label: "Upcoming and urgent" },
                { value: "urgent", label: "Urgent only" },
              ]}
            />
            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                name="quietEnabled"
                defaultChecked={preferences.quietEnabled}
              />
              Use quiet hours
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["quietStart", "quietEnd"] as const).map((name, i) => (
                <div key={name}>
                  <label htmlFor={name} className="text-sm">
                    {i ? "End" : "Start"}
                  </label>
                  <Input
                    id={name}
                    name={name}
                    type="time"
                    required
                    defaultValue={preferences[name]}
                    className="mt-2"
                  />
                </div>
              ))}
            </div>
            <div>
              <label htmlFor="timeZone" className="text-sm">
                Time zone
              </label>
              <Input
                id="timeZone"
                name="timeZone"
                required
                defaultValue={preferences.timeZone}
                placeholder="Asia/Kolkata"
                className="mt-2"
              />
            </div>
            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                name="urgentBypass"
                defaultChecked={preferences.urgentBypass}
              />
              Allow urgent reminders during quiet hours
            </label>
            <p className="text-xs leading-5 text-muted-foreground">
              Settings apply to this inbox. All active work stays in the command
              center. Email and push delivery are not connected.
            </p>
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
