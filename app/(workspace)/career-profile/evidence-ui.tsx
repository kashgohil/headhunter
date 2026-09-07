import { Archive, Ban, Check, ChevronDown, Lock, Pencil, Plus, ShieldCheck, Unlock } from "lucide-react";

import { changeEvidenceControl } from "@/app/(workspace)/career-profile/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EvidenceKind =
  | "career_experience"
  | "career_achievement"
  | "career_skill"
  | "career_profile_item"
  | "career_story"
  | "career_answer"
  | "career_voice";

export type EvidenceRecord = {
  id: string;
  sourceType: "user_entered" | "imported" | "ai_extracted";
  sourceLabel: string | null;
  verificationState: "needs_clarification" | "verified" | "archived" | "prohibited";
  locked: boolean;
};

const stateLabels = {
  needs_clarification: "Needs review",
  verified: "Verified",
  archived: "Archived",
  prohibited: "External use prohibited",
} as const;

const sourceLabels = {
  user_entered: "Entered by you",
  imported: "Imported",
  ai_extracted: "AI extracted",
} as const;

export function EvidenceState({ item }: { item: EvidenceRecord }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={item.verificationState === "verified" ? "signal" : "outline"} className={cn(
        item.verificationState === "prohibited" && "border-destructive/30 text-destructive",
        item.verificationState === "archived" && "text-muted-foreground",
      )}>
        {item.verificationState === "verified" ? <ShieldCheck /> : null}
        {stateLabels[item.verificationState]}
      </Badge>
      {item.locked ? <Badge variant="secondary"><Lock /> Locked</Badge> : null}
    </div>
  );
}

export function EvidenceControls({ item, kind }: { item: EvidenceRecord; kind: EvidenceKind }) {
  return (
    <form action={changeEvidenceControl} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="entityType" value={kind} />
      <input type="hidden" name="entityId" value={item.id} />
      {item.locked ? (
        <Button type="submit" name="locked" value="false" variant="outline" size="sm"><Unlock /> Unlock to change</Button>
      ) : (
        <>
          {item.verificationState !== "verified" ? (
            <Button type="submit" name="verificationState" value="verified" variant="outline" size="sm"><Check /> Verify</Button>
          ) : (
            <Button type="submit" name="verificationState" value="needs_clarification" variant="outline" size="sm">Mark for review</Button>
          )}
          <Button type="submit" name="locked" value="true" variant="ghost" size="sm"><Lock /> Lock</Button>
          {item.verificationState !== "archived" ? <Button type="submit" name="verificationState" value="archived" variant="ghost" size="sm"><Archive /> Archive</Button> : null}
          {item.verificationState !== "prohibited" ? <Button type="submit" name="verificationState" value="prohibited" variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Ban /> Reject from external use</Button> : null}
        </>
      )}
    </form>
  );
}

export function Provenance({ item }: { item: EvidenceRecord }) {
  return <p className="text-xs leading-5 text-muted-foreground">{sourceLabels[item.sourceType]}{item.sourceLabel ? ` · ${item.sourceLabel}` : " · No source note"}</p>;
}

export function Editor({ label, locked, children }: { label: string; locked: boolean; children: React.ReactNode }) {
  if (locked) return <p className="text-xs text-muted-foreground">Unlock this item before editing it.</p>;
  return (
    <details className="group rounded-md border border-border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30">
        <span className="flex items-center gap-2"><Pencil className="size-3.5" /> {label}</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="border-t border-border p-4 sm:p-5">{children}</div>
    </details>
  );
}

export function AddPanel({ title, description, open, children }: { title: string; description: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(28,25,20,0.04)]">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-lg px-5 py-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 sm:px-6">
        <span>
          <span className="flex items-center gap-2 font-semibold tracking-tight"><Plus className="size-4" /> {title}</span>
          <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span>
        </span>
        <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="border-t border-border p-5 sm:p-6">{children}</div>
    </details>
  );
}
