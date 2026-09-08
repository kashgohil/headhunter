"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function UploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"file" | "text">("file");
  const [text, setText] = useState("");
  const [name, setName] = useState("Pasted resume");
  const [recovered, setRecovered] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const file = fileRef.current?.files?.[0];
    if (mode === "file" && (!file || file.size > 5 * 1024 * 1024 || !/\.(pdf|docx)$/i.test(file.name))) { setError("Choose a PDF or DOCX file up to 5 MB, or paste your resume text."); return; }
    if (mode === "text" && (!text.trim() || text.length > 100000)) { setError("Paste between 1 and 100,000 characters."); return; }
    setPending(true);
    try {
      const response = await fetch("/api/resume-import", { method: "POST", headers: { "Content-Type": mode === "file" ? file!.type || "application/octet-stream" : "text/plain;charset=UTF-8", "X-Resume-Name": encodeURIComponent(mode === "file" ? file!.name : name || "Pasted resume") }, body: mode === "file" ? file : text });
      const result = await response.json();
      if (!response.ok) { setError(result.message || "Import failed. Retry with your file or text."); if (result.recoveredText) setRecovered(result.recoveredText); return; }
      router.push(`/career-profile/import/${result.id}`); router.refresh();
    } catch { setError("The upload did not finish. Your input is still here. Retry to reopen any import that was already saved."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    <fieldset disabled={pending} className="flex flex-wrap gap-2"><legend className="sr-only">Resume source</legend><Button type="button" variant={mode === "file" ? "default" : "outline"} aria-pressed={mode === "file"} onClick={() => setMode("file")}>Upload a file</Button><Button type="button" variant={mode === "text" ? "default" : "outline"} aria-pressed={mode === "text"} onClick={() => setMode("text")}>Paste text</Button></fieldset>
    <div className={mode === "file" ? "space-y-2" : "hidden"}><label htmlFor="resume-file" className="text-sm font-medium">Resume file</label><Input ref={fileRef} id="resume-file" type="file" accept=".pdf,.docx" disabled={pending} className="h-auto min-h-10 py-2"/><p className="text-xs leading-5 text-muted-foreground">PDF or DOCX, up to 5 MB. Scanned and password-protected files need pasted text.</p></div>
    <div className={mode === "text" ? "space-y-4" : "hidden"}><div className="space-y-2"><label htmlFor="import-name" className="text-sm font-medium">Source name</label><Input id="import-name" value={name} maxLength={180} disabled={pending} onChange={e => setName(e.target.value)}/></div><div className="space-y-2"><label htmlFor="resume-text" className="text-sm font-medium">Resume text</label><Textarea id="resume-text" value={text} onChange={e => setText(e.target.value)} disabled={pending} className="min-h-64" maxLength={100000} placeholder="Paste your resume, keeping section headings and line breaks."/></div></div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {recovered ? <div className="space-y-2"><p className="text-sm">Recovered text is available even though saving failed.</p><Button type="button" variant="outline" onClick={() => { setText(recovered); setMode("text"); }}>Use recovered text</Button></div> : null}
    <Button disabled={pending} type="submit"><Upload className="size-4"/>{pending ? "Reading resume…" : "Extract for review"}</Button>
    <p role="status" className="text-xs leading-5 text-muted-foreground">{pending ? "Reading text locally. Your career profile will change only after you approve individual facts." : "Processed locally. No AI provider receives your resume. Files are not retained; recovered text and your review are saved on this device."}</p>
  </form>;
}
