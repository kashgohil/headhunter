import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ResumeNotFound() {
  return <div className="grid min-h-[70vh] place-items-center px-6 text-center"><div><h1 className="text-2xl font-semibold tracking-tight">Resume not found</h1><p className="mt-2 text-sm text-muted-foreground">This document may have been removed or the link is incomplete.</p><Button asChild className="mt-6"><Link href="/resumes">Return to resume studio</Link></Button></div></div>;
}
