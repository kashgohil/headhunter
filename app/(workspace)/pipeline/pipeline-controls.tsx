"use client";

import { useActionState, useRef } from "react";
import { LoaderCircle, Plus } from "lucide-react";

import { createCustomStageAction, updatePipelineMetadataAction, type PipelineActionState } from "@/app/(workspace)/pipeline/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pipelineStageDefinitions } from "@/lib/applications/types";

const initialState: PipelineActionState = {};

export function CustomStageControl() {
  const [state, action, pending] = useActionState(createCustomStageAction, initialState);
  return <Popover><PopoverTrigger asChild><Button variant="outline"><Plus/> Custom stage</Button></PopoverTrigger><PopoverContent align="end" className="w-80"><form action={action} className="space-y-4"><div><label htmlFor="custom-stage-label" className="text-sm font-medium">Stage name</label><Input id="custom-stage-label" name="label" className="mt-2" placeholder="Technical exercise" /></div><div><label className="text-sm font-medium">Analytics category</label><Select name="category" defaultValue="interviewing"><SelectTrigger className="mt-2"><SelectValue/></SelectTrigger><SelectContent>{pipelineStageDefinitions.map((stage) => <SelectItem key={stage.key} value={stage.key}>{stage.label}</SelectItem>)}</SelectContent></Select></div>{state.message ? <p role="status" className={state.success ? "text-xs text-signal-foreground" : "text-xs text-destructive"}>{state.message}</p> : null}<Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none"/> : <Plus/>} Add stage</Button></form></PopoverContent></Popover>;
}

export function PipelineMetadataControls({ jobId, priority, interest }: { jobId: string; priority: "low" | "normal" | "high"; interest: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  return <form ref={formRef} action={updatePipelineMetadataAction.bind(null, jobId)} className="flex items-center gap-2">
    <Select name="priority" defaultValue={priority} onValueChange={() => requestAnimationFrame(() => formRef.current?.requestSubmit())}><SelectTrigger className="h-8 w-24 bg-background" aria-label="Priority"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
    <Select name="interest" defaultValue={String(interest)} onValueChange={() => requestAnimationFrame(() => formRef.current?.requestSubmit())}><SelectTrigger className="h-8 w-24 bg-background" aria-label="Interest"><SelectValue/></SelectTrigger><SelectContent>{[1,2,3,4,5].map((value) => <SelectItem key={value} value={String(value)}>Interest {value}</SelectItem>)}</SelectContent></Select>
  </form>;
}
