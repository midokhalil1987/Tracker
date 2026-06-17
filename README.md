# Tempo — Time Tracker

A modern, Clockify-inspired time tracker built with Next.js, React 19, TypeScript, Tailwind CSS 4, Zustand, and Recharts.

## Features

- **Live timer** with description, project, tags, and billable toggle
- **Manual time entries** (date + start time + duration; supports multi-day spans)
- **Time entries** grouped by week with inline editing, duplicate, continue, and delete
- **Projects** with custom colors, clients, hourly rates, and billable defaults
- **Tags** for cross-cutting categorization
- **Dashboard** with weekly KPIs, daily bar chart, and project breakdown
- **Reports** with date-range presets, project & billable filters, charts, and CSV export
- **Excel import/export** (`.xlsx` with validated dropdowns) in Settings
- **Weekday email export** — optional scheduled `.xlsx` reports via SMTP (see `.env.example`)
- **Light / dark / system theme**
- **Local-first** — data stored in `localStorage` via Zustand `persist`

## Tech stack

- Next.js 16 (App Router)
- React 19, TypeScript
- Tailwind CSS 4
- Zustand (`persist` → `localStorage`)
- ExcelJS, Recharts, date-fns, lucide-react

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional: copy `.env.example` → `.env.local` for weekday email exports.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |

## Project structure

```
src/
  app/                 Pages + API routes (sync, email, cron)
  components/          UI (sidebar, timer, pickers, entries, …)
  hooks/               Shared React hooks
  lib/
    store.ts           Zustand store (persisted)
    types.ts           Domain types
    utils.ts           Formatting helpers
    xlsx.ts            Client import + download
    xlsx-export.ts     Server-safe workbook builder
    xlsx-constants.ts  Shared sheet names / headers
    server/            Auth, email, cron, workspace file store
```

## Data

- Browser data lives in `localStorage` key `time-tracker-storage-v1`.
- Email exports sync a snapshot to `.data/workspace.json` on the server when enabled.
- To reset: DevTools → Application → Local Storage → delete `time-tracker-storage-v1`.
