# SENG383-SECTION1-G4

**AI-Assisted Child Development Platform** – SENG 383 Software Project III term project (Fall 2026), Çankaya University.

A web-based decision support platform where parents and specialists share one weekly schedule, task list and record of observations. An AI component summarizes the week's records for each reader according to their role. The AI only supports decisions; it never makes them.

## Team

| Name | GitHub | Role |
|---|---|---|
| Selin Nur Seviş | [@selinsevis](https://github.com/selinsevis) | Team lead & contact person, full-stack developer |
| Göktuğ Eskigöçmen | [@gokenomi](https://github.com/gokenomi) | Full-stack developer, CI & testing |

**Jira board:** https://student-team-w5ttem13.atlassian.net/jira/software/projects/G4/boards/1 (project key `G4`)

## Documents

| Document | File |
|---|---|
| Project Management Plan | [docs/PMP.md](docs/PMP.md) |
| Software Requirements Specification | [docs/SRS.md](docs/SRS.md) |
| Software Design Document | [docs/SDD.md](docs/SDD.md) |
| Weekly meeting notes | [docs/meetings/](docs/meetings/) |

## Repository structure

```
client/          React (Vite) frontend
server/          Node.js + Express backend with SQLite
docs/            PMP, SRS, SDD
docs/img/        Screenshots and diagrams used in the documents
docs/meetings/   Weekly meeting notes (weekNN.md)
```

## Technology

React (Vite) · Node.js + Express · SQLite · JWT authentication · Jest + Supertest, Vitest, Playwright · GitHub Actions · Gemini API (with a mock mode for tests and CI)

Only synthetic data created by a seed script is used. The application runs locally; there is no cloud deployment.

## Running locally

Requirements: Node.js 20 or later.

### Backend (Express + SQLite)

From the repository root, run:

```bash
cd server
npm ci
npm run seed
npm start
```

The backend runs at http://localhost:3000. The seed script creates
`server/data/development.sqlite` and inserts a synthetic sample task. It can be
run again without duplicating the sample or resetting existing tasks. Database
files are ignored by Git. Set `DB_PATH` to use a different SQLite file if needed.

Check http://localhost:3000/api/tasks (or run `curl http://localhost:3000/api/tasks`):

```json
[{ "id": 1, "title": "Read for 20 minutes", "status": "open" }]
```

This v0.0 endpoint serves synthetic demo data without login; it is replaced by
the protected task API in M4. If startup reports that the database is not ready,
run `npm run seed`. Stop the backend with Ctrl+C.

#### Login (M1)

The seed script also creates synthetic demo accounts. All of them use the
password `Demo1234!`:

| Email | Role |
|---|---|
| `parent@demo.test` | parent |
| `teacher@demo.test` | specialist (teacher) |
| `psychologist@demo.test` | specialist (psychologist) |
| `child@demo.test` | child |

`POST /api/auth/login` with `{ "email": "...", "password": "..." }` returns a
JWT and the user's role. Send the token as `Authorization: Bearer <token>`;
`GET /api/auth/me` returns the logged-in user.

#### Children and linked specialists (M2)

The seed also creates one synthetic child, **Can Demo**, who belongs to
`parent@demo.test`, logs in as `child@demo.test`, and is linked to
`teacher@demo.test`. `psychologist@demo.test` is registered but not linked, so
the parent can link and unlink it.

| Method | Endpoint | Who |
|---|---|---|
| GET | `/api/children` | children the user may see |
| GET | `/api/children/:childId/specialists` | parent, linked specialist |
| POST | `/api/children/:childId/specialists` `{ email, specialistType }` | parent |
| DELETE | `/api/children/:childId/specialists/:specialistId` | parent |

A specialist who is not linked to a child gets `403` for every request about
that child, even with a valid token. Other modules protect their child routes
with the same `canAccessChild` middleware (`server/src/children.js`).

To set your own JWT secret, copy `server/.env.example` to `server/.env` and fill
in `JWT_SECRET`. Without it, the backend uses a development-only secret and
prints a warning.

Run the backend database and API tests with `cd server && npm test` from the
repository root. Tests use temporary databases, leaving development data intact.

### Frontend (React + Vite)

```bash
cd client
npm install
npm run dev
```

The page opens at http://localhost:5173. Requests to `/api` are forwarded to the backend at http://localhost:3000, so start the backend first.

Use a second terminal for the frontend. Open http://localhost:5173, log in with
one of the demo accounts above (password `Demo1234!`), and you are taken to the
start page of that role: `/parent`, `/specialist` or `/child`. A user who opens
another role's page is sent back to their own page. Run `npm run build` in
`client/` to verify the frontend production build.

## How we work

- Every task is a Jira issue under one of the 14 epics (PMP-1…PMP-6, M1…M8).
- Branch names and commit messages start with the Jira key, e.g. branch `G4-22-react-skeleton`, commit `G4-22 Add React (Vite) walking skeleton page`.
- No direct pushes to `main`: every change goes through a pull request reviewed by the other member.
- A Jira issue moves to Done only after its pull request is merged.
- Releases are marked with Git tags: `v0.0` (walking skeleton), `v0.1` (M1–M4), `v0.2` (M1–M8), `v1.0` (final).
