# Week 5 Meeting – 2026-10-31

**Attendees:** Selin Nur Seviş, Göktuğ Eskigöçmen  
**Format:** Online

## Discussed
- A team member moved to another group; the previous team repository and Jira project were lost with their account.
- The project was restarted with a new team repository and a new Jira project.
- Jira was set up: Scrum project with key G4, To Do / In Progress / Done board, 14 epics (PMP-1…PMP-6, M1…M8), GitHub for Jira connected.
- PMP-1 was filled in and opened as PR #1.
- The first version of the SRS was drafted.

## Decisions
- Team lead and contact person: Selin. Both members work as full-stack developers.
- Module epic owners: Selin – M1, M2, M5, M8; Göktuğ – M3, M4, M6, M7. PMP epics: Selin. CI and testing setup: Göktuğ.
- Every commit message and branch name starts with the Jira key (e.g. `G4-12 Add login form`).
- No direct pushes to `main`; every change goes through a pull request reviewed by the other member.
- A Jira item is moved to Done only after its pull request is merged.
- Meeting notes are committed every week to `docs/meetings/`.

## Action items
| Task | Owner | Jira |
|---|---|---|
| Accept GitHub and Jira invitations | Göktuğ | – |
| Review and approve PR #1 (PMP-1) | Göktuğ | G4-5 |
| Merge PR #1 after approval | Selin | G4-5 |
| Assign module epics in Jira to their owners | Selin | – |
| Review the SRS first version | Selin, Göktuğ | G4-11 |
| Plan Week 6: SDD first version, PMP-2, walking skeleton (v0.0) | Selin, Göktuğ | G4-6 |
