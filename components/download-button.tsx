"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
export function DownloadButton({
  href,
  filename,
  label,
}: {
  href: string;
  filename: string;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(href);
      if (!response.ok)
        throw new Error(
          "The file could not be exported. Retry the download; your saved document is unchanged.",
        );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(
        "The file could not be exported. Retry the download; your saved document is unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Button variant="outline" disabled={busy} onClick={download}>
        <Download />
        {busy ? "Exporting…" : error ? `Retry ${label}` : label}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 max-w-sm text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
