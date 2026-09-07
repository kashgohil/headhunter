import Link from "next/link";
import { getContacts } from "@/lib/contacts/repository";
import { ActionForm } from "@/components/action-form";
import { saveContactAction } from "./actions";
import { ContactFields } from "./contact-fields";

export default async function ContactsPage() {
  const data = await getContacts();
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="border-b pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Contacts & referrals
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Keep relationships, promises, and opportunities connected.
        </p>
      </header>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-xl font-semibold">Your contacts</h2>
          <ul className="divide-y rounded-lg border bg-card px-5">
            {data.people.map((person) => (
              <li key={person.id} className="py-5">
                <Link
                  href={`/contacts/${person.id}`}
                  className="font-semibold hover:text-primary"
                >
                  {person.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {person.company || "Company not recorded"} ·{" "}
                  {person.relationship}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {
                    data.links.filter((row) => row.link.contactId === person.id)
                      .length
                  }{" "}
                  linked opportunities
                </p>
              </li>
            ))}
          </ul>
          {!data.people.length ? (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Add someone you know or want to contact, then connect them to a
              saved role.
            </p>
          ) : null}
        </section>
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-5 text-xl font-semibold">Add a contact</h2>
          <ActionForm
            action={saveContactAction.bind(null, null)}
            label="Add contact"
          >
            <ContactFields />
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
