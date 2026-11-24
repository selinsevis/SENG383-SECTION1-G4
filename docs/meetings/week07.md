# Week 7 Meeting – 9–15 November 2026

**Attendees:** Selin Nur Seviş, Göktuğ Eskigöçmen  
**Format:** In person. Each of us also met the instructor separately for the progress check.

## Work since last meeting
- Sprint 1 closed: SRS and SDD first versions, PMP-2, README and the walking skeleton (`v0.0`) are on `main`.
- M1 login API with JWT (G4-23) and login page with role routing (G4-24) opened as PRs #9 and #10.
- M2 link/unlink API with access check (G4-25) and linked specialists page (G4-26) opened as PRs #12 and #13.
- PMP-3 progress review written (G4-36, PR #11).

## Discussed
- Feedback from the meetings with the instructor on our progress.
- What remains to finish Sprint 2 before the mid-term: M3, M4 and the first end-to-end test in CI.
- How to split the remaining Sprint 2 work between the two of us.

## Decisions
- Selin owns M1, M2 and the PMP; Göktuğ owns M3, M4 and the end-to-end tests and CI.
- M3 and M4 reuse the existing `authenticate`, `requireRole` and `canAccessChild` checks from M1–M2.
- Release `v0.1` is tagged when M1–M4 and the first end-to-end test are on `main`.

## Action items
| Task | Owner | Jira |
|---|---|---|
| Review PRs #9–#13 and #11 | Göktuğ | G4-23–G4-26, G4-36 |
| M3 events API and calendar | Göktuğ | G4-27, G4-33 |
| M4 tasks API and task screens | Göktuğ | G4-34, G4-35 |
| First end-to-end test in CI | Göktuğ | G4-46 |
| Merge PRs and tag `v0.1` | Selin | |
