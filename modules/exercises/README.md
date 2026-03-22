# Exercises Module

Central place for exercise reads, recurrence handling and mutations.

## Public API

- `fetchClientExercisesSnapshot(clientId, options)`
- `warmExerciseSideEffects(exercises)`
- `completeExercise(exerciseId, answers)`
- `resetExercise(exerciseId)`
- `archiveExercise(exerciseId)`
- `saveDraftAnswers(exerciseId, answers)`

## Notes

- Cached list reads reduce dashboard wait time.
- Recurrence reset logic lives in `recurrence.ts` so it can be tested in isolation.
