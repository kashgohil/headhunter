"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateAlertAction } from "./actions";

export function AlertControls({
  alertKey,
  hidden = false,
}: {
  alertKey: string;
  hidden?: boolean;
}) {
  const [state, action, pending] = useActionState(updateAlertAction, {});
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="key" value={alertKey} />
      <div className="flex flex-wrap gap-1">
        {hidden ? (
          <Button
            size="sm"
            variant="outline"
            name="operation"
            value="restore"
            disabled={pending}
          >
            Restore
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              name="operation"
              value="snooze"
              disabled={pending}
            >
              Snooze 24h
            </Button>
            <Button
              size="sm"
              variant="ghost"
              name="operation"
              value="dismiss"
              disabled={pending}
            >
              Dismiss
            </Button>
          </>
        )}
        {pending ? (
          <span
            role="status"
            className="self-center text-xs text-muted-foreground"
          >
            Saving…
          </span>
        ) : null}
      </div>
      {state.message ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
