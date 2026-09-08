import Link from "next/link";
import { notFound } from "next/navigation";
import { getContacts } from "@/lib/contacts/repository";
import { contactPressure } from "@/lib/contacts/validation";
import {
  ActionForm,
  DateTimeField,
  FormSelect,
} from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ContactFields } from "../contact-fields";
import {
  addInteractionAction,
  saveContactAction,
  saveContactLinkAction,
} from "../actions";
import { DraftEditor } from "../draft-editor";
import { formatDisplayDate } from "@/lib/date";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getContacts();
  const contact = data.people.find((person) => person.id === id);
  if (!contact) notFound();
  const links = data.links.filter((row) => row.link.contactId === id);
  const interactions = data.interactions.filter((row) => row.contactId === id);
  const pressure = contactPressure(interactions, new Date());
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/contacts" className="text-sm text-muted-foreground">
        ← Contacts
      </Link>
      <header className="mt-5 border-b pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          {contact.name}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {contact.company} · {contact.relationship}
        </p>
      </header>
      {pressure ? (
        <p
          role="status"
          className="mt-6 rounded-lg border border-amber-600/30 bg-amber-500/5 p-4 text-sm"
        >
          {pressure}
        </p>
      ) : null}
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Linked opportunities</h2>
          {links.map(({ link, title, company, terminal }) => (
            <article
              key={link.id}
              id={`opportunity-${link.jobId}`}
              className="rounded-lg border bg-card p-5"
            >
              <Link
                href={`/jobs/${link.jobId}`}
                className="font-semibold hover:text-primary"
              >
                {company} · {title}
              </Link>
              {terminal ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  This opportunity is closed. Follow-up suggestions are paused.
                </p>
              ) : null}
              <ActionForm
                action={saveContactLinkAction.bind(null, id)}
                className="mt-5 space-y-4"
              >
                <input type="hidden" name="jobId" value={link.jobId} />
                <FormSelect
                  name={`referralStatus`}
                  label="Referral status"
                  defaultValue={link.referralStatus}
                  options={[
                    { value: "not_requested", label: "Not requested" },
                    { value: "requested", label: "Requested" },
                    { value: "introduced", label: "Introduced" },
                    { value: "declined", label: "Declined" },
                  ]}
                />
                <div>
                  <label
                    className="text-sm font-medium"
                    htmlFor={`follow-${link.id}`}
                  >
                    Follow-up date (UTC)
                  </label>
                  <Input
                    id={`follow-${link.id}`}
                    name="followUpAt"
                    type="date"
                    defaultValue={link.followUpAt?.toISOString().slice(0, 10)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <label
                    className="text-sm font-medium"
                    htmlFor={`promise-${link.id}`}
                  >
                    Promised action / reason to follow up
                  </label>
                  <Input
                    id={`promise-${link.id}`}
                    name="promisedAction"
                    defaultValue={link.promisedAction}
                    className="mt-2"
                  />
                </div>
                <DraftEditor
                  contactName={contact.name}
                  company={company}
                  title={title}
                  draft={link.draft}
                  kind={link.draftKind}
                  voice={
                    data.voice
                      ? `${data.voice.tone}. ${data.voice.principles.join(" ")} Avoid: ${data.voice.avoid.join(", ")}`
                      : null
                  }
                />
              </ActionForm>
            </article>
          ))}
          <article className="rounded-lg border bg-card p-5">
            <h3 className="mb-4 font-semibold">Link an opportunity</h3>
            {data.roles.filter(
              (role) => !links.some((row) => row.link.jobId === role.id),
            ).length ? (
              <ActionForm
                action={saveContactLinkAction.bind(null, id)}
                label="Link opportunity"
              >
                <FormSelect
                  name="jobId"
                  label="Opportunity"
                  options={data.roles
                    .filter(
                      (role) =>
                        !links.some((row) => row.link.jobId === role.id),
                    )
                    .map((role) => ({
                      value: role.id,
                      label: `${role.company} · ${role.title}`,
                    }))}
                />
                <input
                  type="hidden"
                  name="referralStatus"
                  value="not_requested"
                />
                <input type="hidden" name="followUpAt" value="" />
                <input type="hidden" name="promisedAction" value="" />
                <input type="hidden" name="draftKind" value="outreach" />
                <input type="hidden" name="draft" value="" />
              </ActionForm>
            ) : (
              <p className="text-sm text-muted-foreground">
                No unlinked roles.{" "}
                <Link href="/jobs/new" className="text-primary">
                  Capture a job
                </Link>
                .
              </p>
            )}
          </article>
          <section>
            <h2 className="mb-4 text-xl font-semibold">Interaction history</h2>
            <ol className="divide-y">
              {interactions.map((item) => (
                <li key={item.id} className="py-4">
                  <p className="text-sm whitespace-pre-wrap">{item.summary}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.direction} · {item.channel} ·{" "}
                    {formatDisplayDate(item.occurredAt)}
                  </p>
                  {item.jobId ? (
                    <Link
                      href={`/jobs/${item.jobId}`}
                      className="mt-1 block text-xs text-primary"
                    >
                      Open opportunity
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
            {!interactions.length ? (
              <p className="text-sm text-muted-foreground">
                No interactions recorded.
              </p>
            ) : null}
          </section>
        </section>
        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-5">
            <h2 className="mb-5 text-lg font-semibold">
              Record an interaction
            </h2>
            <ActionForm
              action={addInteractionAction.bind(null, id)}
              label="Record interaction"
            >
              <FormSelect
                name="direction"
                label="Direction"
                options={[
                  { value: "note", label: "Private note" },
                  { value: "inbound", label: "Received" },
                  { value: "outbound", label: "Sent elsewhere" },
                ]}
              />
              <FormSelect
                name="channel"
                label="Channel"
                options={["email", "message", "call", "meeting", "other"].map(
                  (value) => ({ value, label: value }),
                )}
              />
              <FormSelect
                name="jobId"
                label="Opportunity"
                options={[
                  { value: "none", label: "General relationship" },
                  ...links.map((row) => ({
                    value: row.link.jobId,
                    label: `${row.company} · ${row.title}`,
                  })),
                ]}
              />
              <DateTimeField name="occurredAt" label="When" />
              <div>
                <label htmlFor="summary" className="text-sm font-medium">
                  What happened?
                </label>
                <Textarea
                  id="summary"
                  name="summary"
                  required
                  className="mt-2"
                />
              </div>
            </ActionForm>
          </section>
          <details className="rounded-lg border bg-card p-5">
            <summary className="cursor-pointer font-semibold">
              Edit contact details
            </summary>
            <div className="mt-5">
              <ActionForm action={saveContactAction.bind(null, id)}>
                <ContactFields contact={contact} />
              </ActionForm>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
