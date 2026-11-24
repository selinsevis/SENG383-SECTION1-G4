# SENG383-SECTION1-G4

AI-Assisted Child Development Platform · SENG 383 Software Project III · Fall 2026

Parents and linked specialists share a child's tasks, weekly schedule, observations
and documents. Weekly statistics use recorded tasks. The role-specific AI summary
currently uses a deterministic offline mock and retains its source records.
The application is local and uses synthetic data only.

## Team

| Name | GitHub | Responsibilities |
|---|---|---|
| Selin Nur Seviş | [selinsevis](https://github.com/selinsevis) | M1, M2, M5, M8; Jira and PMP |
| Göktuğ Eskigöçmen | [gokenomi](https://github.com/gokenomi) | M3, M4, M6, M7; CI and testing |

[Jira board](https://student-team-w5ttem13.atlassian.net/jira/software/projects/G4/boards/1)

## Running locally

Use Node.js **22.12 or newer** (22 LTS recommended) and npm. The frontend tooling
also supports Node 20.19+. Each package has its own package.json; the repository
root has none.

Terminal 1, from the repository root:

```bash
cd server
npm ci
npm run seed
npm start
```

Terminal 2, from the repository root:

```bash
cd client
npm ci
npm run dev
```

Open **http://localhost:5173**. The backend listens on localhost:3000; Vite proxies
`/api` to it. Ctrl+C stops each server. No deployment or Docker is required.

The seed upgrades the SQLite schema without deleting existing records. Old
skeleton tasks retain their IDs/title/status and gain the demo child/assigner and
a due date. The seed does not reset passwords, duplicate tasks, erase observations,
or restore removed specialist links. SQLite files and uploads are ignored by Git.
Run the seed after a schema update; startup checks will tell you if it is needed.

Copy `server/.env.example` to `server/.env` to set `JWT_SECRET` and optionally
`DB_PATH`. Without a secret, a development-only default is used. `AI_MODE=mock`
is the only implemented provider mode. Non-mock configuration returns 503;
there is no real Gemini/GitHub Models call or API-key requirement in this version.

## Demo accounts

| Email | Password | Access |
|---|---|---|
| parent@demo.test | Demo1234! | Can Demo's parent |
| teacher@demo.test | Demo1234! | Linked teacher |
| psychologist@demo.test | Demo1234! | Registered, initially unlinked |
| child@demo.test | Demo1234! | Can Demo's child account |
| admin@admin.com | admin | Local operations and role preview |

Passwords are bcrypt hashes. These are synthetic local demo accounts. New child
profiles and login accounts are created together by their parent with first/last
name, a unique email and a password (at least 8 characters, at most 72 UTF-8 bytes).
Passwords are hashed; the child can log in immediately. New profiles have no linked specialists. Use the specialist-access tab to link one.

Admin can inspect users/health and manage specialist links across children.
The top role-test bar previews the real seeded parent, teacher or child permissions
using the admin token. Preview is remembered per tab; logout clears it. Ordinary
users cannot activate this feature, and a preview does not inherit admin access.

## Screens and behavior

Select a child at the top. The global year/week toolbar has been removed.
Parent/specialist workspaces have Overview, Calendar and Tasks (combined),
Evaluations, Documents and AI Summary. Week filters live inside the sections that
need them. The child has the combined Calendar and Tasks screen. The monthly leaf
calendar displays events inside day cells and task completion counts; choose a
day to filter the event/task details below, or show the whole month.

- **M3 Calendar:** parent/linked specialist adds title, start and optional end;
  start time determines the day. The monthly calendar accepts year/month and
  still supports ISO weekly API filters for reports.
- **M4 Tasks:** title, description, development area and due date; only the child
  owning a task can mark it done or undo it. Undo sets status to open and clears
  completed_at. The assigner and statistics immediately reflect the current status.
  The task subtitle below the calendar lists the selected day or displayed month.
- **M5 Evaluations:** one note per author/child/ISO week. Currently linked authors
  can edit their notes; edits are marked. Parents and linked specialists read them;
  children cannot. A parent can add child profiles with first/last name.
- **M6 Documents:** upload/list/view/download PDF, PNG or JPEG up to 5 MB. Upload
  checks MIME plus signature. Both file bytes (BLOB) and metadata live in SQLite.
  No new file is written to server/uploads. Existing legacy files migrate during
  seed: bytes are committed and verified before the old disk copy is removed.
  Viewing/downloading still repeats authentication and child access checks.
- **M7 Statistics:** completed/total and percentage overall and by language,
  motor, social, cognitive and self-care area. Zero tasks gives 0%, not NaN.
- **M8 Mock AI:** parent/specialist-specific deterministic templates summarize
  the selected week's permitted tasks, notes and events. Saved summaries have
  `AI-generated` and `mock` labels, source snapshots, and helpful/incorrect feedback.
  Opening a source repeats the child-access check. Empty weeks invent no findings.
  PDF/image text extraction and real AI inference are not implemented.

Unlinking a specialist immediately revokes access even if their JWT is still valid,
including to previously assigned tasks, documents and saved summary sources.

## API

All routes except login require a bearer JWT. Child routes reuse the existing
`canAccessChild` middleware. Admin preview adds `X-Preview-Role` and is validated
against the current database admin role on every request.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/auth/login | Email/password login |
| GET | /api/auth/me | Current effective user and optional admin actor |
| GET / POST | /api/children | Accessible children / parent adds profile |
| GET / POST | /api/children/:childId/specialists | List/link specialists |
| DELETE | /api/children/:childId/specialists/:specialistId | Unlink |
| GET / POST | /api/children/:childId/tasks | List/assign tasks |
| PATCH | /api/tasks/:taskId/complete | Child completes own task |
| PATCH | /api/tasks/:taskId/undo | Child reopens own task, clearing completion time |
| GET | /api/tasks/assigned-by-me | Currently accessible tasks assigned by caller |
| GET / POST | /api/children/:childId/events | Weekly events / add event |
| GET / POST | /api/children/:childId/entries | Weekly evaluations / specialist writes |
| PUT | /api/entries/:entryId | Author edits while still linked |
| GET / POST | /api/children/:childId/documents | List/upload, multipart field `file` |
| GET | /api/documents/:docId/view | Protected inline file |
| GET | /api/documents/:docId/download | Protected download |
| GET | /api/children/:childId/stats | Weekly statistics |
| GET / POST | /api/children/:childId/summary | Latest saved / generate mock summary |
| GET | /api/children/:childId/summaries/:id/sources/:sourceId | Saved source snapshot |
| POST | /api/children/:childId/summary/:id/feedback | helpful or incorrect |
| GET | /api/admin/overview | Operations health/counts |
| GET | /api/admin/users | Directory without password hashes |

The calendar accepts `year=2026&month=11`. Weekly reports accept
`year=2026&week=47`; events/statistics also accept a Monday
`weekStart=YYYY-MM-DD`. Summary POST accepts `{ year, week }`. The previous open
`GET /api/tasks` skeleton endpoint has been removed.

## Tests and CI

```bash
cd server
npm test
npm run test:coverage
```

```bash
cd client
npm test
npm run build
```

```bash
cd e2e
npm ci
npx playwright install chromium
npm test
```

On Linux, Playwright may require `npx playwright install --with-deps chromium`.
E2E uses dedicated ports 3100/5174, a temporary SQLite database (including document BLOBs); it does not reuse your running app or development data. Those ports
must be free. `AI_MODE=mock` is explicit in the E2E environment.

GitHub Actions installs dependencies, seeds, runs Jest with a minimum **60% branch
coverage across all server source files**, runs Vitest, builds the client and runs
Playwright. Traces/screenshots/reports are uploaded on failure. The workflow runs
on PRs and pushes to main. Local passing tests do not themselves prove a remote
GitHub Actions run has succeeded.

## Documents

- [Implementation and validation report](docs/IMPLEMENTATION_REPORT_2026-11-15.md)
- [SRS](docs/SRS.md), [SDD](docs/SDD.md), [PMP](docs/PMP.md)
- [Weekly meeting notes](docs/meetings/)

Changes go through reviewed PRs; Jira tasks move to Done after merge. Release tags
remain v0.0, v0.1, v0.2 and v1.0. This local implementation has not been merged,
tagged or deployed by this work.
