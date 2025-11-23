# Copilot Instructions for gehringer-website

This file gives focused, actionable guidance for AI coding agents working on this repository.

1) Project summary
- Purpose: an Astro (frontend) site showing APsystems solar production data and charts.
- Deploy: Netlify; serverless helper in `netlify/functions/apsystems.js` signs/proxies requests to the APsystems API.

2) Key files & where to look
- `package.json` — build/dev scripts (`npm run dev`, `npm run build`, `npm run preview`, `npm run test:aps`).
- `netlify.toml` — Netlify build/dev settings and env placeholders (dev port 4321).
- `netlify/functions/apsystems.js` — server-side proxy that builds the APS signature (Node CommonJS).
- `src/lib/apsystems-client.ts` — ESM client used in the Astro pages; generates HMAC signature using `import.meta.env` values.
- `src/lib/aps-cache.ts` — in-memory cache with TTLs and helper `cachedAPICall` and `CacheKeys` used to limit API requests.
- `src/lib/aps-data-transformer.ts` — domain-specific transforms used by charts (minutely → hourly, pie data, monthly transforms).
- `src/types/apsystems-types.ts` — canonical types/enums for API shapes and response codes.
- `src/pages/solar.astro` — example of server-side data fetching and use of the client + transformers; useful for usage patterns.
- `src/components/SolarCharts.jsx` — chart component consuming transformed data.

3) Environment & secrets
- Required env vars: `APSYSTEMS_APP_ID`, `APSYSTEMS_APP_SECRET`, `APSYSTEMS_SYSTEM_ID`.
- Where to set: Netlify UI for production; locally use a `.env` file for `npm run dev` (project scripts reference `.env.example` in messages — check repo for an example file). The client (`src/lib/apsystems-client.ts`) reads via `import.meta.env`; the Netlify function uses `process.env`.
- Do not hardcode secrets in code or commit `.env` files.

4) Development / debug workflow
- Start local dev: `npm install` then `npm run dev` (Astro dev server at port 4321). Netlify dev configuration in `netlify.toml` mirrors this.
- Quick APsystems connectivity test: `npm run test:aps` runs `scripts/test-aps-connection.ts` (requires valid APS env vars).
- When debugging API signing/requests: compare `netlify/functions/apsystems.js` (CommonJS, server) with `src/lib/apsystems-client.ts` (ESM client). The function is useful if you need to proxy requests or debug server-side behavior.

5) Project-specific patterns & conventions
- Uses Astro with `type: "module"` in `package.json` (ESM). Serverless functions are CommonJS (Netlify compatibility) — be careful mixing import/require semantics.
- Two-layer APsystems access: a serverless proxy exists but client code can call the APS API directly when env vars are available (client uses `createAPSClient()` & `createCachedAPSClient()` patterns). Prefer using the provided client helpers (`src/lib/apsystems-client.ts`) and caching (`src/lib/aps-cache.ts`).
- Caching is explicit: `CacheKeys` + `CacheTTL` in `src/lib/aps-cache.ts`. Follow existing TTL choices when adding endpoints (e.g., `systemSummary` = 5 min).
- Data flow: raw APS responses → `src/lib/aps-data-transformer.ts` → chart props in `src/components/SolarCharts.jsx` → rendered in `src/pages/solar.astro`.

6) Tests & health checks
- `scripts/test-aps-connection.ts` is the canonical connectivity/test script. Use it to validate credentials and see helpful troubleshooting messages.

7) Common edits and examples
- To add a new APS endpoint: add typed return in `src/types/apsystems-types.ts`, client method in `src/lib/apsystems-client.ts`, cache wrapper in `src/lib/aps-cache.ts`, and a transformer if needed in `src/lib/aps-data-transformer.ts`.
- To debug chart issues, reproduce the transformed payload from `solar.astro` and pass it directly to `SolarCharts` in a story or a local test page.

8) Safety and best practices (project-specific)
- Keep secrets in Netlify environment variables for production; locally keep them in `.env` excluded from git.
- Reuse the project's TTLs and cache keys to avoid accidental API rate limits.
- When modifying the Netlify function, keep `rejectUnauthorized: false` in mind: it’s present in the function; avoid removing it without understanding why it was added (may be for particular API TLS behavior).

9) Where to ask/next steps
- If something is ambiguous, check `src/pages/solar.astro` and `scripts/test-aps-connection.ts` for intended usage examples.
- After edits, suggest running `npm run dev` and `npm run test:aps` (with valid env vars) to validate runtime behavior.

Please review and tell me which sections you want expanded or any missing project details to add.
