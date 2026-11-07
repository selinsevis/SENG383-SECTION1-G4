# Week 6 Meeting – 2026-11-07

**Attendees:** Selin Nur Seviş, Göktuğ Eskigöçmen  
**Format:** Online

## Discussed
- Reviewed the work done so far against the course schedule: PMP-1 (PR #1, merged), SRS first version (PR #2), SDD first version (G4-20).
- Checked the Jira setup: 4 sprints and the tasks under the 14 epics (PMP-1…PMP-6, M1…M8).
- Found an empty sub-task (G4-4) that was not linked to any epic; it was deleted.
- Discussed and filled in PMP-2: work packages (epics) table and sprint plan (PR #4).
- Opened PR #3 for the SDD first version.
- Moved G4-6, G4-19, G4-20 and G4-22 to In Progress in Jira.

## Decisions
- PMP-2 work packages and sprint plan match the epics and sprints in Jira (Sprint 1: Week 6, Sprint 2: Weeks 7–8, Sprint 3: Weeks 9–10, Sprint 4: Weeks 11–12).
- Walking skeleton (v0.0): SQLite holds a sample task, Express returns it at `GET /api/tasks` on port 3000, and the React page shows it.

## Action items
| Task | Owner | Jira |
|---|---|---|
| Backend skeleton: Express + SQLite, seed script with a sample task, `GET /api/tasks` | Göktuğ | G4-21 |
| Review and approve PR #2 (SRS), #3 (SDD), #4 (PMP-2), #5 (React skeleton) | Göktuğ | G4-11, G4-20, G4-19, G4-22 |
| Merge approved PRs, tag `main` as `v0.0`, move finished Jira tasks to Done | Selin | G4-19, G4-20, G4-22 |
