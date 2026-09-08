# ISSUE-285 validation

Validated on 9 September 2026 with Node 24.13.0, Bun 1.3.14, Next.js 16.3.4, Docker Desktop, Caddy, Chromium 150, a disposable Linux ARM64 container, and synthetic credentials/data. No public deployment was created, no real account was configured, and no external service was connected.

## Deployment-readiness result

The application is ready for a private single-owner hosted installation when the operator follows [Private hosted deployment](hosted-deployment.md). Production startup fails closed without an explicit hosted mode, canonical HTTPS origin, owner password hash, session secret, backup key, absolute writable persistent directory, and truthful persistent/encrypted-storage attestations. The application container binds only to host loopback behind Caddy and runs as the unprivileged `node` user. The supplied Compose configuration drops Linux capabilities and disables privilege escalation.

The release validation built `headhunter:issue-285` for Linux ARM64 as image `sha256:64491574b835d72a2627f8ec8f531ce12afab1234e7e7042638ee6b03083e4bd`. A fresh disposable container applied migration 0022 before starting, returned `{"status":"ready"}`, kept its mounted directory at mode `0700`, and kept SQLite and generated backup files at mode `0600`. The exact digest will differ across architecture and rebuilds; production should record and pin its own tested digest.

No code or data-protection blockers remain. DNS, a real encrypted host volume, production secrets, certificate issuance, off-host backup storage, and deployment approval remain installation responsibilities because ISSUE-285 does not authorize deployment.

## Access and authorization coverage

- Hosted login uses a scrypt-hashed single-owner password and permits five attempts per reverse-proxy client address in a fifteen-minute window.
- Signed cookies expire after twelve hours and use `HttpOnly`, `Secure`, `SameSite=Lax`, and path `/`. SQLite stores only a digest of the random session identifier. Logout deletes the live record; session-secret rotation invalidates all cookies.
- Proxy tests cover unsigned/forged/expired cookies, noncanonical hosts, forwarded HTTPS, cross-origin mutations, public health, and local loopback-only mode.
- Static coverage parses every action module and verifies owner authorization is the first statement of all 76 workspace Server Actions. It also verifies all five private route handlers authorize the live session. The workspace layout forces request-time authorization before protected server-rendered reads.
- The browser replay checks unauthenticated search, source viewer, guessed job ID, PDF download, and API denial; invalid and valid login; requested-route preservation; an authorized workspace read; encrypted export; cross-origin rejection; logout; reuse of a revoked signed cookie; an expired cookie; health; and a 375 px login layout.

The Chromium result was:

```text
PASS hosted TLS login, private-route/API/direct-action denial, owner use, encrypted export, origin rejection, logout revocation, expiry, health, and mobile layout
```

## Data protection and recovery coverage

- Hosted browser exports, operator backups, and pre-restore recovery copies use AES-256-GCM. Tests reject readable input, the wrong key, and modified ciphertext.
- An operator backup was created inside the running release container, read back, decrypted, and checked against the current schema, checksum, tables, columns, and scalar types.
- Session records are excluded from every backup. Ordinary exports continue to omit Calendar credentials, cached events, and links; encrypted operator recovery can retain the integration graph.
- Startup checks storage configuration and performs a real write probe. Readiness checks SQLite and data-directory access without returning internal details.
- The runbook defines key/password rotation, daily/weekly/monthly retention, off-host copy, quarterly restore tests, same-schema recovery, deletion, disaster recovery, upgrade, and rollback.

## Final automated verification

```sh
bun run lint
bunx tsc --noEmit
bun run test
docker compose -f compose.hosted.yaml config --quiet
caddy adapt --config deploy/Caddyfile --adapter caddyfile
docker build -t headhunter:issue-285 .
```

ESLint and TypeScript passed. The complete suite passed 120 Bun tests and 39 Node/SQLite tests. The Compose and Caddy configurations validated, the production webpack build completed inside the Docker image, the final image reported healthy, and the TLS browser replay passed.

Run the browser replay only against a disposable loopback deployment:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs \
CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
ACCEPTANCE_URL=https://headhunter.localhost:3443 \
ACCEPTANCE_PASSWORD='synthetic acceptance password' \
ACCEPTANCE_SESSION_SECRET='the synthetic container session secret' \
node scripts/issue-285-acceptance.mjs
```

The runner refuses non-loopback hostnames. Its local TLS certificate may be private; the browser context ignores certificate errors only for this isolated replay.
