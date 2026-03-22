import { Exercise } from "../../types";

export type ExerciseStatus = "assigned" | "open" | "in_progress" | "completed" | "archived";

export function deriveExerciseStatus(exercise: Partial<Exercise>): ExerciseStatus {
    if (exercise.archived || exercise.status === "archived") return "archived";
    if (exercise.status === "completed" || exercise.completed) return "completed";
    if (exercise.status === "in_progress") return "in_progress";
    if (exercise.status === "open") return "open";
    if (exercise.status === "assigned") return "assigned";

    const hasDraftAnswers = !!exercise.draftAnswers && Object.keys(exercise.draftAnswers).length > 0;
    const hasAnswers = !!exercise.answers && Object.keys(exercise.answers).length > 0;

    if (hasDraftAnswers || hasAnswers) return "in_progress";
    return "assigned";
}

export function normalizeExercise<T extends Partial<Exercise>>(exercise: T): T & Exercise {
    const status = deriveExerciseStatus(exercise);

    return {
        ...exercise,
        status,
        completed: status === "completed",
        archived: status === "archived",
    } as T & Exercise;
}

export function isExerciseDone(exercise: Partial<Exercise>): boolean {
    return deriveExerciseStatus(exercise) === "completed";
}

export function isExerciseActive(exercise: Partial<Exercise>): boolean {
    const status = deriveExerciseStatus(exercise);
    return status === "assigned" || status === "open" || status === "in_progress";
}
