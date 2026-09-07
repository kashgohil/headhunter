"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contacts,
  contactOpportunities,
  contactInteractions,
  jobs,
} from "@/lib/db/schema";
import {
  contactSchema,
  contactLinkSchema,
  interactionSchema,
} from "@/lib/contacts/validation";
import type { FormState } from "@/components/action-form";

function refresh(id: string) {
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/");
  revalidatePath("/pipeline");
}
export async function saveContactAction(
  id: string | null,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  try {
    const now = new Date();
    const key = id ?? crypto.randomUUID();
    if (id) {
      const result = await db
        .update(contacts)
        .set({ ...parsed.data, updatedAt: now })
        .where(eq(contacts.id, id));
      if (!result.changes) throw new Error("Contact not found.");
    } else
      await db
        .insert(contacts)
        .values({ id: key, ...parsed.data, createdAt: now, updatedAt: now });
    refresh(key);
    return {
      success: true,
      message:
        "Contact saved. Open their name to manage opportunities and follow-ups.",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Could not save contact.",
    };
  }
}
export async function saveContactLinkAction(
  contactId: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = contactLinkSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  try {
    const [person, job] = await Promise.all([
      db.select().from(contacts).where(eq(contacts.id, contactId)).get(),
      db.select().from(jobs).where(eq(jobs.id, parsed.data.jobId)).get(),
    ]);
    if (!person || !job)
      throw new Error("Choose an existing contact and opportunity.");
    const values = { ...parsed.data, contactId, updatedAt: new Date() };
    await db
      .insert(contactOpportunities)
      .values({ id: crypto.randomUUID(), ...values })
      .onConflictDoUpdate({
        target: [contactOpportunities.contactId, contactOpportunities.jobId],
        set: values,
      });
    refresh(contactId);
    revalidatePath(`/jobs/${parsed.data.jobId}`);
    return {
      success: true,
      message:
        "Opportunity, reminder, and private draft saved. No message was sent.",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Could not save opportunity.",
    };
  }
}
export async function addInteractionAction(
  contactId: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const values = Object.fromEntries(form);
  const localDate =
    typeof values.occurredAt === "string" ? new Date(values.occurredAt) : null;
  if (localDate && Number.isFinite(localDate.getTime()))
    values.occurredAt = localDate.toISOString();
  if (values.jobId === "none") values.jobId = "";
  const parsed = interactionSchema.safeParse(values);
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  try {
    if (
      !(await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, contactId))
        .get())
    )
      throw new Error("Contact not found.");
    const links = await db
      .select()
      .from(contactOpportunities)
      .where(eq(contactOpportunities.contactId, contactId));
    if (
      parsed.data.jobId &&
      !links.some((link) => link.jobId === parsed.data.jobId)
    )
      throw new Error("Link this opportunity to the contact first.");
    await db
      .insert(contactInteractions)
      .values({
        id: crypto.randomUUID(),
        contactId,
        ...parsed.data,
        createdAt: new Date(),
      });
    refresh(contactId);
    return { success: true, message: "Interaction recorded." };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Could not record interaction.",
    };
  }
}
