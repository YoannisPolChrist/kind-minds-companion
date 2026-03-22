/**
 * repositories/index.ts
 *
 * Central export for all repository classes.
 * Screens import from here instead of calling Firestore directly.
 *
 * Pattern: Repository abstracts the data source.
 * If you ever switch from Firestore → something else, only these files change.
 */

export { ExerciseRepository } from './ExerciseRepository';
export { ClientRepository } from './ClientRepository';
export { NoteRepository } from './NoteRepository';
export { ResourceRepository } from './ResourceRepository';
