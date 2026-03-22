# Checkins Module

Central place for check-in reads and writes.

## Public API

- `fetchCheckinStatusSnapshot(userId, options)`
- `submitCheckin(payload, isConnected)`
- `updateCheckin(uid, date, updates)`

## Notes

- Short-lived AsyncStorage cache keeps dashboard reads fast.
- Screen hooks should call this module instead of talking to Firestore directly.
