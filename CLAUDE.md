# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

Goal Tracker is a personal weekly goal/task tracking application built with:
- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Netlify Functions (serverless)
- **Database**: Netlify DB (NeonDB) with Drizzle ORM
- **File Storage**: Netlify Blobs
- **Icons**: Lucide React
- **Routing**: React Router v7

## Common Commands

```bash
npm run dev          # Start Vite dev server (includes Netlify env via plugin)
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint check
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations (via Netlify)
npm run db:push      # Push schema changes (via Netlify)
npm run db:studio    # Open Drizzle Studio (via Netlify)
```

**Important**: Use `npm run dev` for local development. The `@netlify/vite-plugin` handles Netlify environment injection - do NOT use `netlify dev`.

## Netlify Functions

Functions use the correct Netlify syntax with Config exports:

```typescript
import type { Config, Context } from "@netlify/functions";

export const config: Config = {
  path: ["/api/resource", "/api/resource/:id"],
};

export default async function handler(req: Request, context: Context): Promise<Response> {
  const { id } = context.params;  // Access path params here
  // ...
}
```

**Key rules**:
- Use `context.params` for path parameters (NOT query strings)
- Use clean RESTful nested routes: `/api/weeks/:weekId/tasks`, `/api/tasks/:taskId/notes`
- Import shared modules with `.js` extension: `from "./_shared/db.js"`

## Database

### Schema (`db/schema/`)
- `weeks` - Week records with id format "YYYY-WW" (e.g., "2026-05")
- `categories` - Task categories with optional parent for subcategories
- `tasks` - Tasks with staleness tracking (0-4+), status enum, previousVersionId for lineage
- `recurring_tasks` - Weekly recurring task definitions
- `notes` - Markdown notes (stores both raw markdown AND rendered HTML)
- `attachments` - File metadata with blob keys
- `backlog_items` - Priority-ordered backlog
- `follow_ups` - Staged items for next week

### Connection (`netlify/functions/_shared/db.ts`)
```typescript
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@netlify/neon";

const sql = neon();  // Auto-uses NETLIFY_DATABASE_URL
export const db = drizzle(sql, { schema });
```

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/weeks` | GET, POST | List/create weeks |
| `/api/weeks/:id` | GET, DELETE | Get/delete week |
| `/api/weeks/:weekId/tasks` | GET | List tasks for week |
| `/api/tasks/:id` | GET, PATCH, DELETE | Task CRUD |
| `/api/tasks/:id/toggle` | POST | Toggle task status |
| `/api/tasks/:id/to-backlog` | POST | Move task to backlog |
| `/api/tasks/:taskId/notes` | GET | List notes for task |
| `/api/categories` | GET, POST | List/create categories |
| `/api/categories/:id` | GET, PATCH, DELETE | Category CRUD |
| `/api/recurring` | GET, POST | List/create recurring tasks |
| `/api/recurring/:id` | GET, PATCH, DELETE | Recurring task CRUD |
| `/api/recurring/:id/toggle` | POST | Toggle active status |
| `/api/notes/:id` | GET, PATCH, DELETE | Note CRUD |
| `/api/notes/:noteId/attachments` | GET | List attachments |
| `/api/backlog` | GET, POST | List/create backlog items |
| `/api/backlog/:id` | GET, PATCH, DELETE | Backlog item CRUD |
| `/api/backlog/:id/to-week` | POST | Move to week |
| `/api/backlog/:backlogItemId/notes` | GET | List notes |
| `/api/follow-ups` | GET, POST | List/create follow-ups |
| `/api/follow-ups/:id` | DELETE | Delete follow-up |
| `/api/weeks/new` | POST | Generate new week |
| `/api/weeks/new/data` | GET | Get wizard data (no previous week) |
| `/api/weeks/new/data/:previousWeekId` | GET | Get wizard data with previous week |
| `/api/upload` | POST | Upload attachment |
| `/api/attachments/:id` | DELETE | Delete attachment |
| `/api/attachments/blob/*` | GET | Get blob content |

## Frontend Structure

- `src/pages/` - Route components (Dashboard, WeekView, WeekWizard, etc.)
- `src/components/` - Organized by feature (ui/, tasks/, wizard/, backlog/, recurring/)
- `src/lib/` - Utilities (api.ts, dates.ts, scores.ts, markdown.ts)
- `src/types/` - TypeScript type definitions

## Key Patterns

### Week IDs
ISO week format: `YYYY-WW` (e.g., "2026-05"). Use `src/lib/dates.ts` utilities.

### Score Calculation (`src/lib/scores.ts`)
- Red: <50%
- Yellow: 50-75%
- Green: 75-90%
- Fire: 90%+

### Staleness Tracking
Tasks track weeks carried over (0-4+). Staleness 4+ auto-deselected in wizard.

### Markdown
Both raw markdown AND rendered HTML stored in DB. Render on save, not read.

## Environment Variables

Automatically set by Netlify:
- `NETLIFY_DATABASE_URL` - Pooled connection (functions)
- `NETLIFY_DATABASE_URL_UNPOOLED` - Direct connection (migrations)

## Deployment

```bash
netlify deploy --prod
```
