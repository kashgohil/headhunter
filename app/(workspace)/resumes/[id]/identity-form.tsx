"use client";

import { useActionState } from "react";
import { updateResumeIdentityAction, type ResumeActionState } from "@/app/(workspace)/resumes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Identity = { candidateName: string; candidateEmail: string; candidatePhone: string; candidateLocation: string; candidateWebsite: string };

export function IdentityForm({ resumeId, identity }: { resumeId: string; identity: Identity }) {
  const [state, action, pending] = useActionState(updateResumeIdentityAction.bind(null, resumeId), {} as ResumeActionState);
  const fields = [
    ["candidateName", "Full name", "name"],
    ["candidateEmail", "Email", "email"],
    ["candidatePhone", "Phone", "tel"],
    ["candidateLocation", "Location", "text"],
    ["candidateWebsite", "Website or profile URL", "url"],
  ] as const;
  return <form action={action} className="grid gap-4 sm:grid-cols-2">{fields.map(([name,label,type]) => <div key={name} className={name === "candidateWebsite" ? "sm:col-span-2" : ""}><label htmlFor={`draft-${name}`} className="text-sm font-medium">{label}</label><Input id={`draft-${name}`} name={name} type={type} defaultValue={identity[name]} maxLength={name === "candidateWebsite" ? 500 : name === "candidateEmail" ? 254 : name === "candidatePhone" ? 60 : 160} className="mt-2" aria-invalid={Boolean(state.errors?.[name])}/>{state.errors?.[name] ? <p className="mt-1 text-xs text-destructive">{state.errors[name]?.[0]}</p> : null}</div>)}<div className="flex flex-wrap items-center gap-3 sm:col-span-2"><Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving…" : "Save candidate header"}</Button>{state.message ? <p role="status" className={`text-sm ${state.success ? "text-signal-foreground" : "text-destructive"}`}>{state.message}</p> : null}</div></form>;
}
