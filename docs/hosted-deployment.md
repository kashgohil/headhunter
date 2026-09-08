# Private hosted deployment

ISSUE-285 defines one supported hosted target: a single-owner Docker container on a private Linux host, with Caddy terminating HTTPS and an encrypted persistent host directory mounted at `/data`. The application port binds only to host loopback. The host administrator and secret store remain trusted; multi-user accounts and shared workspaces are outside this boundary.

## Access modes

Local development remains explicit and loopback-only:

```sh
HEADHUNTER_ACCESS_MODE=local bun dev
```

Local mode has no login, but the request proxy refuses non-loopback hostnames. Production startup refuses to run until `HEADHUNTER_ACCESS_MODE=hosted` and all hosted storage and secret settings are present. Hosted mode provides one password-authenticated owner account. There is no signup or password-reset email flow.

Owner sessions expire twelve hours after login. The signed cookie is `HttpOnly`, `Secure`, `SameSite=Lax`, path-scoped to `/`, and contains a random session identifier rather than private workspace data. Its digest and expiry are stored in SQLite. Logout deletes that record and the browser cookie; session-secret rotation invalidates every outstanding cookie. `Lax` is required so the authenticated owner can return from the Google OAuth top-level redirect.

The request proxy validates signed cookies, the canonical host and forwarded HTTPS protocol, and exact mutation origins. The protected workspace layout validates authorization at request time, every Server Action repeats the owner check, and every private route handler checks the live server-side session. Login permits five attempts per client address in each fifteen-minute window; Caddy is the trusted source of that address because the application listener is host-loopback only. Unauthenticated page reads redirect to login; private APIs return `401`; wrong hosts and cross-origin mutations return `403`. The health endpoint is the only public API and returns only `ready` or `unavailable`.

## Secrets

Generate independent values. Do not reuse the backup, calendar, or session keys.

```sh
openssl rand -base64 48 # HEADHUNTER_SESSION_SECRET
openssl rand -hex 32    # HEADHUNTER_BACKUP_KEY
openssl rand -hex 32    # CALENDAR_TOKEN_KEY, when Calendar is enabled
read -s OWNER_PASSWORD
printf %s "$OWNER_PASSWORD" | bun run auth:hash-password
unset OWNER_PASSWORD
```

Store `HEADHUNTER_SESSION_SECRET`, `HEADHUNTER_BACKUP_KEY`, `HEADHUNTER_OWNER_PASSWORD_HASH`, `CALENDAR_TOKEN_KEY`, and Google client secrets in the host secret manager or a root-readable service environment file outside the repository. Do not place them in the image, Compose file, shell history, logs, or backup directory.

- Rotate the owner password by generating a new hash, updating the secret, restarting, and checking login. Existing sessions remain valid until logout or session-secret rotation.
- Rotate the session secret by updating it and restarting. This logs out all sessions immediately.
- Rotate the backup key only after verifying old backups with the old key. Keep the old key offline until those backups expire, then create and verify a new backup with the new key.
- Rotate `CALENDAR_TOKEN_KEY` by disconnecting Calendar, updating the key, restarting, and reconnecting. A lost key requires reconnecting; tokens cannot be recovered.

## Host and container setup

Install Docker Engine, Compose, and Caddy on a supported Linux host. Configure full-disk encryption or an encrypted block volume first. The application cannot prove the underlying medium is encrypted; `HEADHUNTER_STORAGE_ENCRYPTED=true` is an operator attestation and must never be set for an unencrypted path.

Create the private data directory on that encrypted volume for container uid 1000:

```sh
sudo install -d -m 700 -o 1000 -g 1000 /srv/headhunter/data
export HEADHUNTER_DATA_PATH=/srv/headhunter/data
export HEADHUNTER_PERSISTENT_STORAGE=true
export HEADHUNTER_STORAGE_ENCRYPTED=true
```

Set `APP_ORIGIN` to the final origin, such as `https://jobs.example.com`, and set `HEADHUNTER_HOST` to its hostname. Supply the secrets above, then build and start:

```sh
docker compose -f compose.hosted.yaml build
docker compose -f compose.hosted.yaml up -d
sudo HEADHUNTER_HOST=jobs.example.com caddy run --config deploy/Caddyfile --adapter caddyfile
```

Caddy must be the only public listener. The Compose mapping exposes port 3050 only on `127.0.0.1`; do not publish the container port on a public interface. Caddy obtains and renews TLS certificates and forwards the canonical host and HTTPS protocol. If another reverse proxy is used, it must overwrite forwarded-host/protocol headers and preserve the same loopback-only application binding.

The image runs as an unprivileged user with Linux capabilities dropped and privilege escalation disabled. Startup checks the access mode, canonical HTTPS origin, secret shapes, absolute persistent data path, encryption/persistence attestations, permissions, and a real write probe. It runs all Drizzle migrations before starting Next.js and refuses to serve if migration fails. SQLite, WAL, and shared-memory files use owner-only permissions. Resume source text, snapshots, notes, and integration records live inside that encrypted SQLite volume; original uploaded files are not retained. Calendar tokens also have field-level AES-256-GCM encryption.

Check readiness from the host or container orchestrator:

```sh
curl --fail http://127.0.0.1:3050/api/health
```

Readiness verifies a SQLite query and read/write access to the persistent directory without exposing record counts, paths, versions, or error details.

## Backup, restore, and retention

Hosted browser exports and pre-restore recovery copies use authenticated AES-256-GCM encryption with `HEADHUNTER_BACKUP_KEY`. Their `.hhbackup` envelope exposes no table data. Owner session records are never exported, so restore cannot resurrect a logged-out session. Operator backups include encrypted Calendar integration records; ordinary browser exports continue to omit the integration graph.

Create and immediately verify an operator backup on the mounted volume:

```sh
docker compose -f compose.hosted.yaml exec headhunter \
  node scripts/hosted-backup.mjs create /data/backups
docker compose -f compose.hosted.yaml exec headhunter \
  node scripts/hosted-backup.mjs verify /data/backups/headhunter-TIMESTAMP.hhbackup
```

Copy the verified ciphertext to a separate encrypted, access-controlled backup location. Keep seven daily, four weekly, and twelve monthly copies; configure that retention in the external backup system and test a restore quarterly. Delete expired remote objects and their provider versions. Local pre-restore recovery copies appear in Data & history and should be removed from `/data/recovery` after the replacement is verified and the next off-host backup succeeds.

To restore after data loss:

1. Provision the same application image version and a new encrypted data directory.
2. Restore the matching backup key and, if the operator backup contains Calendar credentials, the matching Calendar token key.
3. Start once so migrations create the expected schema, then sign in.
4. Open Data & history, select the `.hhbackup`, inspect its timestamp and record counts, type `REPLACE`, and restore.
5. Verify representative jobs, source views, resume PDF download, audit history, Calendar state, and `/api/health`; then create and verify a fresh off-host backup.

Restore is same-schema only and transactionally writes a recovery copy before replacement. A schema mismatch must be restored with its matching image version and then upgraded normally.

Before deleting the hosted workspace, create and verify a final backup if retention is required, revoke Google access, stop the service, securely delete the data and backup volumes, remove remote backup versions according to provider procedure, and destroy the session, backup, and Calendar keys. Without those keys, retained ciphertext is unrecoverable.

## Upgrade and rollback

Before an upgrade, create and verify an off-host encrypted backup and record the current image digest. Build the new image, stop the service, and start it against the existing persistent directory; startup applies migrations before accepting traffic. Verify login, health, direct private-route denial, a representative read/write, export, and PDF download.

For an application-only regression whose prior image supports the current schema, stop and restart with the recorded prior digest. When a migration is incompatible with the prior image, provision a clean encrypted directory, start the prior image, restore its matching pre-upgrade backup, verify it, and only then switch traffic. Never point an older image at a schema it does not support.

Application and reverse-proxy request logs must omit bodies, cookies, authorization values, and query strings because search terms and OAuth callback parameters can be private. Limit log access and retention at the host. TLS protects traffic to Caddy; the loopback hop to the container never leaves the host.
