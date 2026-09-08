# Headhunter

Headhunter is a personal job-search operating system for finding worthwhile roles, creating truthful tailored applications, tracking opportunities, preparing for interviews, and learning what produces positive outcomes.

The canonical scope, feature specification, and delivery roadmap are in [docs/product-plan.md](docs/product-plan.md).

## Getting started

```bash
bun install
bun dev
```

Open [http://localhost:3050](http://localhost:3050).

Google Calendar is optional and requires local OAuth credentials plus an encryption key. See [calendar integration setup](docs/calendar-integration.md).

Private hosted mode uses a single-owner session, encrypted persistent storage, encrypted backups, a locked-down container, and a loopback TLS proxy. Follow the [hosted deployment and recovery runbook](docs/hosted-deployment.md) before exposing the application.

The application is currently a Next.js scaffold. Product decisions should be checked against the product plan before implementation.
