# Implement signaling event

Use this skill when adding or modifying a Socket.io signaling event in Roomly.

## Goal

Implement a signaling event safely and consistently for a production-grade realtime meeting product.

## Required process

1. Define the exact purpose of the event.
2. Define whether the event is room-wide, peer-to-peer, or server acknowledgement.
3. Define the payload type explicitly in `types/`.
4. Add runtime validation for all incoming payload fields.
5. Check sender identity, room membership, and target identity before emitting.
6. Prevent self-emit unless explicitly intended.
7. Keep the server as a signaling coordinator only.
8. Consider disconnect, reconnect, duplicate joins, and stale peer cases.
9. Return or emit explicit errors when validation fails.
10. Summarize edge cases after implementation.

## Mandatory checks

- roomId exists and is valid
- sender exists
- targetUserId exists when required
- payload shape is validated at runtime
- no blind broadcast
- no duplicate peer flow introduced
- disconnect and user-left cleanup impact considered

## Output expectations

When finishing, provide:

- what changed
- payload type added or updated
- runtime validation added
- edge cases checked
- remaining risks
