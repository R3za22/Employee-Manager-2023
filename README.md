# Employee Manager

A staff-records tool for a small HR office, in English and Persian (RTL, Jalali dates, Persian digits). Employee list with search, filter, sort and pagination, profiles with a weekly shift pattern, add/edit with validation (Iranian national-ID checksum, personnel number, dates), delete with confirm and undo, departments, CSV/JSON import and export with row-by-row validation, and a printable shift schedule.

> **Built for a friend's university project (2023), rebuilt in 2026.** There is no backend: in the default `mock` mode all data lives in this browser's `localStorage`, seeded with fictional people. National IDs in the seed are generated sample values with valid check digits (and one deliberately invalid, to show the "needs attention" flow).

**Stack:** Vite, React 18, TypeScript, React Router (hash routing, so it works on any static host). Fonts: Vazirmatn (Persian) and IBM Plex Sans, both OFL, bundled locally. Design: "Daftar Ledger" canvas.

## Run

```sh
npm install
npm run dev          # http://localhost:5173
npm run lint && npm run typecheck && npm test
npm run e2e          # Playwright flows against the mock adapter
npm run build        # dist/
npm run build:demo   # dist-demo/ (relative base, demo banner), same code as the app
```

Open `/?lang=fa` for Persian. The language choice is remembered.

## Data modes

`src/api/` defines the `EmployeeApi` contract with two adapters, selected by env (see `.env.example`):

| `VITE_API_MODE` | Adapter | Notes |
|---|---|---|
| `mock` (default) | `mockAdapter.ts` | `localStorage`, seeded data, validation, history and activity log; "Reset sample data" on the Import/export page |
| `live` | `liveAdapter.ts` | Stub that calls a REST API at `VITE_API_BASE_URL` (`/employees`, `/departments`, `/activity`, `/backup`). No server is included. |

In mock mode no request leaves the page (covered by an e2e test).

## Import and export

CSV columns: `personnelNo, givenName, surname, givenNameFa, surnameFa, nationalId, department, jobTitle, jobTitleFa, status, shiftGroup, startDate` (use the template download). Dates can be ISO or Jalali. JSON accepts a plain array or a backup file. Every row is validated; rows with problems are listed and skipped. Exported CSV cells that would start a spreadsheet formula are prefixed with `'`. Exports contain national IDs, so keep them private.

## Notes

- Persian copy was written for this project and should be reviewed by a native speaker.
- The old stock background photographs and IRANSans font were removed (unknown source / proprietary). Icons are inline SVG.
