"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DraftEditor({
  contactName,
  company,
  title,
  draft,
  kind,
  voice,
}: {
  contactName: string;
  company: string;
  title: string;
  draft: string;
  kind: string;
  voice: string | null;
}) {
  const id = useId();
  const [text, setText] = useState(draft);
  const [selected, setSelected] = useState(kind);
  const templates: Record<string, string> = {
    outreach: `Hi ${contactName},\n\nI’m interested in the ${title} role at ${company}. [Add a specific reason and a relevant, verified example.] Would you be open to a short conversation?\n\n[Your name]`,
    referral: `Hi ${contactName},\n\nI’m considering the ${title} role at ${company}. [Explain your fit and how you know each other.] If you feel comfortable, would you consider referring me? No pressure if not.\n\n[Your name]`,
    follow_up: `Hi ${contactName},\n\nFollowing up on [the conversation or commitment] about ${title} at ${company}. [Add one useful update or a clear question.]\n\n[Your name]`,
    thank_you: `Hi ${contactName},\n\nThank you for [the specific help or conversation]. [Mention what you found useful and any agreed next step.]\n\n[Your name]`,
  };
  return (
    <div className="space-y-3">
      <label htmlFor={`${id}-kind`} className="text-sm font-medium">
        Private message draft
      </label>
      <Select name="draftKind" value={selected} onValueChange={setSelected}>
        <SelectTrigger id={`${id}-kind`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(templates).map((value) => (
            <SelectItem key={value} value={value}>
              {value.replaceAll("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={Boolean(text)}
        onClick={() => setText(templates[selected])}
      >
        Start from a template
      </Button>
      <label htmlFor={`${id}-draft`} className="sr-only">
        Draft text
      </label>
      <Textarea
        id={`${id}-draft`}
        name="draft"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="min-h-48"
      />
      <p className="text-xs leading-5 text-muted-foreground">
        {voice
          ? `Your verified voice guidance: ${voice}`
          : "Edit in your own voice and replace every bracketed prompt before using this draft."}{" "}
        Saving keeps a private draft; sending happens outside Headhunter.
      </p>
    </div>
  );
}
