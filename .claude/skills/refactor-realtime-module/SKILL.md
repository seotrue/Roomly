# Refactor realtime module

Use this skill when refactoring Socket.io, WebRTC hooks, room state handling, or realtime lifecycle logic in Roomly.

## Goal

Improve maintainability without breaking realtime behavior.

## Required process

1. Identify current responsibility mixing.
2. Separate concerns across:
   - route handlers
   - socket signaling logic
   - WebRTC connection lifecycle
   - UI state
   - Zustand state
3. Remove duplicated event handling and duplicated cleanup logic.
4. Preserve existing payload contracts unless explicitly changing them.
5. Audit leave, disconnect, reconnect, refresh, and unmount flows.
6. Keep peer connection ownership explicit.
7. Prefer small explicit functions over generic abstractions.
8. Call out regression risks clearly.

## Mandatory checks

- no `RTCPeerConnection` stored in `useState`
- cleanup remains explicit
- no hidden side effects introduced
- event names and payload shapes remain consistent
- store responsibilities do not swallow socket or WebRTC responsibilities

## Output expectations

When finishing, provide:

- previous structure problems
- new responsibility boundaries
- code paths with highest regression risk
- manual test cases that should be run
