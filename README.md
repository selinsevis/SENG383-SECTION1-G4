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

Setup steps will be added with the backend walking skeleton (G4-21). The backend runs at http://localhost:3000.

### Frontend (React + Vite)

```bash
cd client
npm install
npm run dev
```

The page opens at http://localhost:5173. Requests to `/api` are forwarded to the backend at http://localhost:3000, so start the backend first.

## How we work

- Every task is a Jira issue under one of the 14 epics (PMP-1…PMP-6, M1…M8).
- Branch names and commit messages start with the Jira key, e.g. branch `G4-22-react-skeleton`, commit `G4-22 Add React (Vite) walking skeleton page`.
- No direct pushes to `main`: every change goes through a pull request reviewed by the other member.
- A Jira issue moves to Done only after its pull request is merged.
- Releases are marked with Git tags: `v0.0` (walking skeleton), `v0.1` (M1–M4), `v0.2` (M1–M8), `v1.0` (final).
