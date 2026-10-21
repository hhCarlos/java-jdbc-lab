Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-20T19:23:50-06:00

Task prompt:

Diagnose why changing publication status in ProductForm edit mode is not working.

Follow AGENTS.md and all applicable task prerequisites.

Authoritative statuses:
1 = ACTIVE
2 = INACTIVE
3 = DELETED

Trace the actual flow:
- GET response and its frontend model.
- Initialization of the suspended checkbox.
- Checkbox changes and edit-submission eligibility.
- Serialized PUT payload.
- Backend request binding, status decision, repository parameters, and returned status.

Expected behavior:
- ACTIVE initializes suspended=false.
- INACTIVE initializes suspended=true.
- Positive stock enables the checkbox.
- Checked sends active=false and results in INACTIVE.
- Unchecked sends active=true and results in ACTIVE when stock is positive.
- Zero stock forces INACTIVE.
- DELETED remains unavailable.
- A status-only edit must enable saving.
- Both checkbox values are valid; do not require it to be checked.

Use the actual response field names and types. Do not assume whether the API returns a numeric status ID or a status code. Ensure disabled controls do not accidentally remove active from the payload.

The PUT contract uses active, not a client-supplied status_id.

Inspect before changing code. Fix the identified frontend defect within front-end/. If evidence identifies a backend defect, report the exact mismatch before making backend changes.

Add a regression test reproducing the identified failure, run relevant tests and the Angular build, and report the root cause and fix. Never log tokens or credentials.
