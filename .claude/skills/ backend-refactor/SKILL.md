# Backend Refactor Workflow

Use the backend-engineer agent to perform a safe backend refactor of the Roomly signaling server.

## Step 1 — Analyze

Analyze the current backend implementation.

Focus on:

- server.ts bootstrap responsibilities
- room-service vs room-store separation
- socket event validation
- disconnect / leave cleanup safety
- signaling membership validation

Output:

1. structural problems
2. minimal refactor plan

---

## Step 2 — Implement minimal changes

Apply the refactor while preserving current behavior.

Rules:

- no `any`
- no abbreviated variable names
- keep server.ts thin
- move policies to room-service
- keep room-store as storage layer only

---

## Step 3 — Validate signaling safety

Ensure:

- offer / answer / ice-candidate only relay between peers in the same room
- invalid targets are ignored
- no broadcast without room membership check

---

## Step 4 — Output summary

Provide:

1. files changed
2. code changes summary
3. regression risks
4. manual test checklist
