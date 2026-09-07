import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { isPrivateAddress } from "@/lib/jobs/network-safety";

const MAX_SOURCE_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 8_000;

export class SourceFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceFetchError";
  }
}

async function assertSafeUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new SourceFetchError("Use an http or https job URL.");
  }
  if (url.username || url.password) {
    throw new SourceFetchError("Job URLs cannot include credentials.");
  }
  if (url.port && !["80", "443"].includes(url.port)) {
    throw new SourceFetchError("Job URLs must use a standard web port.");
  }

  const hostname = url.hostname.toLocaleLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new SourceFetchError("Local and private network addresses cannot be imported.");
  }

  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true }).catch(() => {
      throw new SourceFetchError("That job site could not be reached.");
    });

  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new SourceFetchError("Local and private network addresses cannot be imported.");
  }

  return url;
}

async function readLimitedBody(response: Response) {
  const statedLength = Number(response.headers.get("content-length") ?? 0);
  if (statedLength > MAX_SOURCE_BYTES) {
    throw new SourceFetchError("That page is too large to import safely.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_SOURCE_BYTES) {
      await reader.cancel();
      throw new SourceFetchError("That page is too large to import safely.");
    }
    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
}

export type FetchedJobSource = {
  url: string;
  body: string;
  contentType: string;
  fetchedAt: Date;
};

export async function fetchJobSource(value: string): Promise<FetchedJobSource> {
  let currentUrl = await assertSafeUrl(value);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: "text/html,text/plain;q=0.9",
        "User-Agent": "Headhunter/0.1 job-importer",
      },
    }).catch((error: unknown) => {
      if (error instanceof SourceFetchError) throw error;
      throw new SourceFetchError("That job page could not be downloaded. Paste the description instead.");
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new SourceFetchError("That job page redirected too many times.");
      }
      currentUrl = await assertSafeUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (!response.ok) {
      throw new SourceFetchError(`That job page returned ${response.status}. Paste the description instead.`);
    }

    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLocaleLowerCase() ?? "";
    if (!contentType.startsWith("text/html") && !contentType.startsWith("text/plain")) {
      throw new SourceFetchError("That URL does not point to a readable job page.");
    }

    return {
      url: currentUrl.toString(),
      body: await readLimitedBody(response),
      contentType,
      fetchedAt: new Date(),
    };
  }

  throw new SourceFetchError("That job page could not be imported.");
}
