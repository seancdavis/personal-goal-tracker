# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

Goal Tracker is a personal weekly goal/task tracking application built with:
- **Frontend**: Vite + React + TypeScript + Tailwind CSS v4
- **Backend**: Netlify Functions (serverless)
- **Database**: Netlify DB (NeonDB) with Drizzle ORM
- **File Storage**: Netlify Blobs
- **Icons**: Lucide React
- **Routing**: React Router v7

## Common Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint check
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio
```

## Architecture

### Database Schema (`db/schema/`)
- `weeks` - Week records with id format "YYYY-WW" (e.g., "2026-05")
- `categories` - Task categories with optional parent for subcategories
- `tasks` - Tasks with staleness tracking (0-4+), status enum, previousVersionId for lineage
- `recurring_tasks` - Weekly recurring task definitions
- `notes` - Markdown notes on tasks/backlog items (stores both raw markdown AND rendered HTML)
- `attachments` - File metadata with blob keys
- `backlog_items` - Priority-ordered backlog
- `follow_ups` - Staged items for next week, linked to source task

### API Layer (`netlify/functions/`)
- RESTful endpoints under `/api/*`
- Shared utilities in `_shared/`: db client, response helpers, markdown rendering
- `generate-week.ts` is the critical orchestration endpoint for the week wizard

### Frontend Structure (`src/`)
- `pages/` - Route components (Dashboard, WeekView, WeekWizard, etc.)
- `components/` - Organized by feature (ui/, tasks/, wizard/, etc.)
- `lib/` - Utilities (api.ts, dates.ts, scores.ts, markdown.ts)
- `types/` - TypeScript type definitions

## Key Patterns

### Week IDs
Week IDs use ISO week format: `YYYY-WW` (e.g., "2026-05"). Use `src/lib/dates.ts` utilities:
- `getCurrentWeekId()`, `getNextWeekId()`, `getPreviousWeekId()`
- `getWeekStartDate()`, `getWeekEndDate()`, `formatWeekRange()`

### Score Calculation
Completion percentage with color thresholds in `src/lib/scores.ts`:
- Red: <50%
- Yellow: 50-75%
- Green: 75-90%
- Fire: 90%+

### Staleness Tracking
Tasks track how many weeks they've been carried over (0-4+). In the week wizard:
- Tasks with staleness 4+ are auto-deselected
- Staleness increments when a task is carried to a new week

### Markdown Storage
Both raw markdown AND rendered HTML are stored in the database. Rendering happens on save (in API functions), not on read. Use `renderMarkdown()` from `netlify/functions/_shared/markdown.ts`.

## Environment Variables

Required for Netlify deployment:
- `DATABASE_URL` - NeonDB connection string (set via Netlify DB)

## Deployment

```bash
netlify deploy --prod
```

Ensure database is initialized:
```bash
netlify db init --boilerplate=drizzle
npm run db:generate
npm run db:migrate
```
