# AGENTS.md - Coding Guidelines for gehringer-website

This file provides comprehensive guidelines for agentic coding assistants working on the gehringer-website repository. It ensures consistent code quality, follows project conventions, and integrates existing rules for efficient development.

## Project Overview
- **Type**: Astro-based frontend website with React components for solar energy data visualization.
- **Tech Stack**: Astro, React, TypeScript, Tailwind CSS, Chart.js/Recharts.
- **Deployment**: Netlify with serverless functions (CommonJS) for API proxying.
- **Key Features**: APsystems API integration, caching, data transformation, interactive charts, contact forms.

## Environment Setup
- **Dependencies**: Run `npm install` to install packages.
- **Environment Variables** (required for full functionality):
  - `APSYSTEMS_APP_ID`, `APSYSTEMS_APP_SECRET`, `APSYSTEMS_SYSTEM_ID`
  - Set in Netlify UI for production; locally use `.env` file (exclude from git).
  - Client code reads via `import.meta.env`; serverless functions use `process.env`.
- **Local Development**: `npm run dev` starts Astro dev server at port 4321.

## Build, Lint, and Test Commands

### Build Commands
- `npm run build`: Builds production site to `./dist/`.
- `npm run preview`: Previews build locally before deployment.
- `npm run dev`: Starts local dev server with hot reload.

### Lint and Type Check Commands
- `astro check`: Runs TypeScript type checking and Astro validation (use after changes).
- No dedicated linter configured; recommend adding ESLint: `npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin`.
  - Suggested script: `"lint": "eslint src --ext .js,.ts,.astro,.jsx"`
- Format code with Prettier if added: `"format": "prettier --write src/**/*.{js,ts,astro,jsx}"`.

### Test Commands
- `npm run test:aps`: Runs connectivity test for APsystems API (requires valid env vars).
  - Located in `scripts/test-aps-connection.ts`.
- No unit/integration tests found; recommend adding Vitest for testing.
  - Install: `npm install --save-dev vitest @testing-library/react @testing-library/jest-dom`.
  - Suggested scripts: `"test": "vitest"`, `"test:ui": "vitest --ui"`, `"test:run": "vitest run"`.
- Single test run: `vitest run <test-file>` (once Vitest is added).

Always run `astro check` and `npm run build` after changes to ensure no type errors or build issues.

## Code Style Guidelines

### General Principles
- Follow TypeScript strict mode (enforced by `astro/tsconfigs/strict`).
- Use ESM (`type: "module"` in package.json).
- Prefer functional components in React; use hooks over class components.
- Keep code readable, concise, and well-commented (no verbose comments unless complex logic).
- Follow DRY (Don't Repeat Yourself); reuse utilities from `src/lib/`.

### Imports
- Group imports: External libraries first, then internal modules.
- Use absolute paths from `src/` (e.g., `import { client } from '@/lib/apsystems-client'` if alias configured).
- Sort alphabetically within groups.
- Avoid wildcard imports (`import *`); import specific exports.
- For React: `import { useState } from 'react';`

### Formatting
- Indentation: 2 spaces.
- Line length: Aim for 80-100 characters; use line breaks for long lines.
- Semicolons: Always use.
- Quotes: Single quotes for strings, double for JSX attributes.
- Tailwind classes: One line if short; multi-line if long, sorted logically.
- Use Prettier defaults if configured.

### Types and TypeScript
- Define interfaces/enums in `src/types/` (e.g., `src/types/apsystems-types.ts`).
- Use `type` for unions/objects; `interface` for extendable objects.
- Avoid `any`; use specific types or `unknown` with type guards.
- Enable strict null checks; handle potential `null`/`undefined`.
- For API responses: Validate shapes with Zod or similar if added.

### Naming Conventions
- **Files**: Kebab-case (e.g., `solar-data.ts`, `energy-charts.astro`).
- **Components**: PascalCase (e.g., `SolarCharts.jsx`).
- **Variables/Functions**: CamelCase (e.g., `cachedAPICall`, `transformData`).
- **Constants**: UPPER_SNAKE_CASE (e.g., `CACHE_TTL`).
- **Enums**: PascalCase for enum name, UPPER_SNAKE_CASE for values.
- **Hooks**: `use` prefix (e.g., `useSolarData`).

### Error Handling
- Use try/catch for async operations (e.g., API calls).
- Validate API responses; throw descriptive errors.
- Leverage caching (`src/lib/aps-cache.ts`) to handle failures gracefully.
- Log errors with console.error; avoid exposing sensitive data.
- For forms: Validate inputs client-side; handle server errors in components.

### Security Best Practices
- Never hardcode secrets; use env vars only.
- Sanitize user inputs (e.g., for contact forms) to prevent XSS.
- Avoid logging secrets or sensitive data.
- Use HTTPS for all external requests.

### Performance
- Cache API responses with TTLs (reuse patterns from `src/lib/aps-cache.ts`).
- Lazy-load components if pages grow large.
- Optimize images in `public/`; use responsive Tailwind classes.
- Minimize re-renders in React with `useMemo`/`useCallback` for expensive ops.

### Other Conventions
- **Styling**: Use Tailwind utility classes; avoid custom CSS unless necessary.
  - Conditional classes: Use `clsx` or `cn` from `tailwind-merge`.
- **Data Flow**: Raw API → Transformers (`src/lib/aps-data-transformer.ts`) → Components.
- **API Integration**: Use `src/lib/apsystems-client.ts` and `createCachedAPSClient()`.
- **Charts**: Prefer Recharts for consistency; pass transformed data as props.
- **Serverless Functions**: CommonJS; test locally with Netlify CLI.

## Project-Specific Patterns
- **APsystems API**: Use client helpers for signing/requests; cache with `CacheKeys` and TTLs (e.g., 5min for summaries).
- **Data Transformation**: Follow `src/lib/aps-data-transformer.ts` for minutely→hourly conversions.
- **Caching**: Explicit TTLs; avoid redundant API calls.
- **Debugging**: Compare client (`src/lib/apsystems-client.ts`) vs. server (`netlify/functions/apsystems.js`).
- **Forms**: Use React state; integrate with potential backend via n8n workflows.

## Integrated Rules from Copilot Instructions
- Reuse provided client/cache/transformer patterns.
- For new endpoints: Add types, client method, cache wrapper, transformer.
- Debug charts by reproducing transformed payload.
- Keep `rejectUnauthorized: false` in Netlify functions if present.
- Test with `npm run dev` and `npm run test:aps`.

## Best Practices and Pitfalls
- Always test with valid APS env vars to avoid API errors.
- Follow existing TTLs to prevent rate limits.
- Commit changes via `git add . && git commit -m "message" && git push`.
- Avoid modifying `.env` or secrets in code.
- If adding dependencies, check compatibility with Astro/React.
- For complex logic, reference `src/pages/solar.astro` as a usage example.

## Maintenance
- Update this file when adding tools (e.g., ESLint, Vitest).
- Run `astro check` pre-commit if possible.
- Suggest improvements to package.json scripts for better DX.

