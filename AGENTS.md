<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project interface rules

- Style interfaces with Tailwind CSS utilities. Do not add component-specific custom CSS classes.
- Build interface primitives with shadcn/ui and adapt them to the Headhunter theme.
- Use Geist Sans and Geist Mono through `next/font` for application typography.
- Use Motion for purposeful React animation. Keep frequent interactions crisp and avoid decorative motion that slows work down.
- Apply Emil Kowalski's design-engineering principles while building UI and run the animation-review skill before completing motion work.
- Do not use eyebrow text anywhere, including chip- or badge-shaped eyebrow substitutes above headings. Status badges remain acceptable only when they communicate a real object state in context; never use them as decoration. Avoid ornamental status dots.

## Progress commits

- Commit progress in small, focused chunks as each coherent change is ready and validated. Do not accumulate an entire issue's implementation into one large commit.
- Split unrelated fixes, tests, and documentation into reviewable commits; keep tests with the behavior they verify when practical.
