export type AccessMode = "hosted" | "local";

type Environment = Record<string, string | undefined>;

export function accessMode(environment: Environment = process.env): AccessMode {
  const configured = environment.HEADHUNTER_ACCESS_MODE;
  if (configured === "hosted" || configured === "local") return configured;
  if (environment.NEXT_PHASE === "phase-production-build") return "local";
  if (environment.NODE_ENV === "production") {
    throw new Error(
      "Set HEADHUNTER_ACCESS_MODE explicitly before starting a production server.",
    );
  }
  return "local";
}

export function isLoopbackHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}

export function configuredOrigin(environment: Environment = process.env) {
  const raw = environment.APP_ORIGIN;
  if (!raw) throw new Error("APP_ORIGIN is required in hosted mode.");
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("APP_ORIGIN must be an HTTPS origin without a path.");
  }
  return url.origin;
}
