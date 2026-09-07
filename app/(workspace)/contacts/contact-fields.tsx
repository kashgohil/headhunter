import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/action-form";
import type { contacts } from "@/lib/db/schema";
export function ContactFields({
  contact,
}: {
  contact?: typeof contacts.$inferSelect;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { name: "name", label: "Name", value: contact?.name },
          { name: "company", label: "Company", value: contact?.company },
          { name: "email", label: "Email", value: contact?.email },
          {
            name: "profileUrl",
            label: "Profile URL",
            value: contact?.profileUrl,
          },
        ].map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="text-sm font-medium">
              {field.label}
            </label>
            <Input
              id={field.name}
              name={field.name}
              defaultValue={field.value ?? ""}
              className="mt-2"
              required={field.name === "name"}
              type={
                field.name === "email"
                  ? "email"
                  : field.name === "profileUrl"
                    ? "url"
                    : "text"
              }
            />
          </div>
        ))}
      </div>
      <FormSelect
        name="relationship"
        label="Relationship strength"
        defaultValue={contact?.relationship}
        options={[
          { value: "new", label: "New contact" },
          { value: "acquaintance", label: "Acquaintance" },
          { value: "warm", label: "Warm relationship" },
          { value: "close", label: "Close relationship" },
        ]}
      />
      <div>
        <label htmlFor="context" className="text-sm font-medium">
          Relationship context
        </label>
        <Textarea
          id="context"
          name="context"
          defaultValue={contact?.context}
          placeholder="How you know each other; avoid assuming a relationship that is not there."
          className="mt-2"
        />
      </div>
    </>
  );
}
