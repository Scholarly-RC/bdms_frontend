# CLAUDE.md

This document defines working rules for AI/code agents in `bdms_frontend`.

## Goal

Build and maintain a modern, responsive Next.js frontend using shadcn/ui components and predictable project conventions.

## Tech Stack

- Next.js `16.1.6` (App Router)
- React `19`
- TypeScript (strict)
- Tailwind CSS `v4`
- shadcn/ui (`new-york` style)
- Icons: `lucide-react`
- Tooling: `pnpm`, `biome`

## Repository Layout

- `app/layout.tsx`: root app layout and metadata.
- `app/globals.css`: Tailwind/shadcn tokens and global styles.
- `app/page.tsx`: root route (currently redirects to `/login`).
- `app/login/page.tsx`: login page.
- `app/dashboard/page.tsx`: dashboard page.
- `components/ui/*`: shadcn-generated UI primitives.
- `lib/utils.ts`: shared utility helpers (`cn`).
- `components.json`: shadcn config.

## Runbook

- Install dependencies: `pnpm install`
- Start dev server: `pnpm dev`
- Build production bundle: `pnpm build`
- Start production server: `pnpm start`
- Lint: `pnpm lint`
- Format: `pnpm format`

## shadcn Rules

- Use official shadcn generation for UI components.
- Do not hand-roll replacements for components available in shadcn.
- Add components with:
  - `pnpm dlx shadcn@latest add <component...>`
- Keep `components.json` as the source of truth for shadcn config.

## Environment Workaround (General)

If commands fail with environment-related network/cache/permission issues such as:

- `ERR_PNPM_META_FETCH_FAIL`
- `getaddrinfo EAI_AGAIN registry.npmjs.org`
- `EACCES ... ~/.cache/pnpm/dlx/...`
- `Operation not permitted (os error 1)` for process/port binding

use this workaround:

1. Set a local cache directory:
   - `XDG_CACHE_HOME=/home/sharles/Projects/BDMS/.pnpm-cache`
2. Prefer running commands with `pnpm` and the local cache prefix:
   - `XDG_CACHE_HOME=/home/sharles/Projects/BDMS/.pnpm-cache pnpm install`
   - `XDG_CACHE_HOME=/home/sharles/Projects/BDMS/.pnpm-cache pnpm build`
   - `XDG_CACHE_HOME=/home/sharles/Projects/BDMS/.pnpm-cache pnpm lint`
3. For shadcn, run via pnpm dlx (not npm/npx):
   - `XDG_CACHE_HOME=/home/sharles/Projects/BDMS/.pnpm-cache pnpm dlx shadcn@latest init -d`
   - `XDG_CACHE_HOME=/home/sharles/Projects/BDMS/.pnpm-cache pnpm dlx shadcn@latest add button card input label avatar badge progress separator`
4. If sandbox restrictions block networking or process binding, rerun the same command with elevated permissions in the execution environment.

## Build Notes

- In restricted/offline environments, avoid runtime font fetching from Google Fonts.
- Prefer local/system font stacks in `app/layout.tsx` and CSS tokens when network access is unreliable.

## Non-Negotiable Quality Rules

- Keep pages responsive on desktop and mobile.
- Reuse `components/ui/*` before introducing new primitives.
- Keep changes scoped to requested functionality.
- Keep TypeScript errors at zero.
- Keep lint/format checks clean before finalizing.

## Change Checklist

For each non-trivial change:

1. Implement using existing component and route conventions.
2. Generate new shadcn components (if needed) with `pnpm dlx shadcn@latest add`.
3. Run `pnpm lint` and `pnpm build`.
4. Update this file or `README.md` if workflows/commands change.

## Avoid

- Mixing package managers in commands (prefer `pnpm` consistently).
- Bypassing shadcn for common UI primitives.
- Large design refactors outside scope.
- Introducing global CSS rules that conflict with shadcn tokens.
