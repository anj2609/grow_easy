# GrowEasy CSV Importer

An AI-powered CSV importer that maps leads from **any** CSV layout — Facebook lead exports,
Google Ads exports, real-estate CRM exports, sales reports, hand-made spreadsheets — into the
fixed GrowEasy CRM schema, without assuming fixed column names.

- **Live app:** https://grow-easy-frontend-lovat.vercel.app/
- **Backend API:** https://groweasy-backend-geo4.onrender.com (health check: `/health`)
- **Position applied for:** Full-Time

## How it works

1. **Upload** — drag & drop (or pick) a `.csv` file.
2. **Preview** — the CSV is parsed entirely client-side and shown in a sticky-header,
   virtualized, scrollable table. No network call happens here.
3. **Confirm Import** — only now does the frontend call the backend. The backend re-parses the
   file server-side, splits rows into batches, and sends each batch to an LLM (Gemini by default,
   Anthropic supported as a swap-in) with a schema-constrained prompt that maps arbitrary columns
   onto the 15 GrowEasy CRM fields. Progress streams back to the UI batch-by-batch over NDJSON.
4. **Results** — imported vs. skipped records, with color-coded status/skip-reason badges, in
   the same reusable table component.

## Architecture

npm workspaces monorepo:

```
groweasy/
  shared/     @groweasy/shared — CRM types, enums, and API contract shared by both apps
  backend/    Express + TypeScript API
  frontend/   Next.js (App Router) + TypeScript + Tailwind
```

### Backend (`backend/`)

- `POST /api/import/process` (`multipart/form-data`, field `file`) — the only API endpoint.
- `services/csvParser.ts` — server-side CSV parsing (papaparse), independent of the client's
  preview parse. No assumption anywhere about column names.
- `services/batcher.ts` — splits rows into configurable batches (`BATCH_SIZE`, default 25).
- `services/aiPrompt.ts` — the shared system prompt and user-message builder used by every
  provider, so behavior stays consistent regardless of which LLM is configured.
- `services/aiExtractor.ts` — `AIProvider` interface with two implementations:
  - `GeminiProvider` (default) — Gemini structured output via `responseSchema`.
  - `AnthropicProvider` — Claude tool-use, forcing a JSON array output.
  Both return one record per input row, in order, so batch failures stay attributable to the
  right source rows. Requests are wrapped in a timeout (`AI_REQUEST_TIMEOUT_MS`) and retried with
  exponential backoff (`lib/retry.ts`); a batch that still fails after retries is marked skipped
  with reason `ai_processing_failed` instead of failing the whole import.
- `services/postProcess.ts` — a deterministic safety net applied to every extracted record,
  regardless of what the model returned:
  - blanks `crm_status` / `data_source` if not exactly one of the allowed enum values,
  - blanks `created_at` if it isn't `new Date()`-parseable,
  - collapses raw newlines in every field into literal `\n` (keeps records CSV-safe),
  - **skip rule**: a record with neither `email` nor `mobile_without_country_code` is moved to
    the skipped list with reason `missing_email_and_mobile`. This is enforced in code, not left
    to the model, so it's deterministic and testable.
- The response is streamed as **NDJSON** — one JSON object per line — so the frontend gets
  incremental progress instead of waiting for the whole import to finish. If something fails
  mid-stream (after headers are already sent), an `error` event is written instead of a JSON
  error response, and the connection is always closed cleanly.

### Frontend (`frontend/`)

- `lib/useImportWizard.ts` — owns all wizard state (`upload → preview → processing → results`)
  behind one hook, so `app/page.tsx` stays a thin view. Handlers are `useCallback`-wrapped and
  streaming updates use functional `setState` so each NDJSON line triggers exactly one
  re-render, regardless of import size.
- `components/DataTable.tsx` — a **generic, reusable** table with a sticky header, horizontal +
  vertical scrolling, and row virtualization (`@tanstack/react-virtual`) so the DOM node count
  stays constant whether the CSV has 10 rows or 100,000. The row is a memoized subcomponent so
  unrelated table state changes don't re-render already-mounted rows. Reused for the preview
  table and both results tables.
- `components/StatusBadge.tsx`, `SummaryCard.tsx`, `StepIndicator.tsx` — small reusable,
  memoized presentational components extracted so they're independently testable.
- `components/UploadDropzone.tsx` — drag & drop + click-to-browse + keyboard accessible.
- `components/ImportProgress.tsx` / `ResultsView.tsx` — streamed progress and the final
  imported/skipped breakdown, with color-coded `crm_status` and skip-reason badges.
- `lib/csv.ts` — client-side preview parsing (papaparse).
- `lib/api.ts` — reads the backend's NDJSON stream via `fetch` + `ReadableStream`, buffering
  partial lines across chunk boundaries.
- `lib/theme.ts` — single source of truth mapping semantic meaning (`crm_status` value, skip
  reason, tone) to a UI color, so components never hardcode a color literal.
- `app/globals.css` — the actual color values, as CSS custom properties with light/dark
  overrides under a `.dark` class, mapped into Tailwind v4 via `@theme inline`. Retheming the
  whole app means editing values in exactly one place.
- Dark mode: a pre-hydration inline script in `app/layout.tsx` sets the `.dark` class before
  paint (reads `localStorage`, falls back to OS preference) so there's no flash-of-wrong-theme
  or hydration mismatch; `ThemeToggle` persists the choice.

## Prompt engineering notes

The system prompt (`backend/src/services/aiPrompt.ts`) explicitly encodes every rule from the
spec: the 15-field schema, the two closed enums (blank if not confidently matched, never
invented), the `new Date()`-parseable date rule, the multi-email/multi-phone → first value kept +
rest appended to `crm_note` rule, and worked examples for ambiguous headers ("Contact No" /
"WhatsApp Number" → mobile, "Lead Date" / "Submitted At" → created_at, "Remarks" / "Comments" →
crm_note, "Assigned To" / "Agent" → lead_owner, "Campaign" / "Source" → data_source only if it
confidently matches the allowed list).

Structured output (Gemini `responseSchema` / Anthropic tool-use) is used instead of asking the
model to emit raw JSON in prose, so the response shape is enforced by the API rather than parsed
with regex. Everything the model returns is still re-validated deterministically in
`postProcess.ts` before it reaches the client — the model is never trusted blindly.

## Setup

### Prerequisites

- Node.js 20+
- An AI provider key: [Gemini API key](https://aistudio.google.com/apikey) (default) or an
  Anthropic API key

### Local development

```bash
npm install
cp .env.example backend/.env   # fill in GEMINI_API_KEY (or switch AI_PROVIDER=anthropic)
npm run dev                    # runs backend on :4000 and frontend on :3000 concurrently
```

Open http://localhost:3000.

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `AI_PROVIDER` | `gemini` | `gemini` or `anthropic` |
| `GEMINI_API_KEY` | — | required when `AI_PROVIDER=gemini` |
| `GEMINI_MODEL` | `gemini-flash-latest` | Gemini model id |
| `ANTHROPIC_API_KEY` | — | required when `AI_PROVIDER=anthropic` |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | Anthropic model id |
| `PORT` | `4000` | backend port |
| `CORS_ORIGIN` | `http://localhost:3000` | allowed frontend origin |
| `BATCH_SIZE` | `25` | rows sent to the AI per batch |
| `BATCH_CONCURRENCY` | `3` | concurrent in-flight batches |
| `MAX_UPLOAD_MB` | `10` | max upload size |
| `AI_REQUEST_TIMEOUT_MS` | `45000` | per-attempt timeout before retry/skip |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000` | frontend → backend base URL |

### Tests

```bash
npm test   # runs backend (vitest) then frontend (vitest) suites
```

### Docker

```bash
cp .env.example .env   # fill in GEMINI_API_KEY at minimum
docker compose up --build
```

Frontend on http://localhost:3000, backend on http://localhost:4000.

## Deployment

- **Backend** — Render Web Service, built from `backend/Dockerfile` (multi-stage: builds
  `shared` + `backend`, runs `node backend/dist/index.js`). `PORT` is injected by Render and
  read via `config.ts`; `CORS_ORIGIN` is scoped to the exact deployed frontend origin (no
  trailing slash — browsers match `Access-Control-Allow-Origin` byte-for-byte against `Origin`,
  which never has one).
- **Frontend** — Vercel, Root Directory `frontend`, with the install/build commands overridden
  to resolve the `@groweasy/shared` workspace dependency from the repo root before building the
  Next.js app: Install `cd .. && npm install`, Build `cd .. && npm run build -w shared && npm run
  build -w frontend`. `NEXT_PUBLIC_API_BASE_URL` points at the Render backend URL above.
- Free-tier note: the Render service spins down after ~15 min idle, so the first request after
  a period of inactivity takes 20-50s to cold-start.

## CRM fields

`created_at, name, email, country_code, mobile_without_country_code, company, city, state,
country, lead_owner, crm_status, crm_note, data_source, possession_time, description`

Allowed `crm_status`: `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE`.

Allowed `data_source`: `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`,
`sarjapur_plots`.
