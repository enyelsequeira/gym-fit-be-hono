import { z } from "@hono/zod-openapi";

import { WORKOUT_DAYS } from "@/db/schema";

// Base types
export type DayType = typeof WORKOUT_DAYS[number];

// Base weight tracking schemas and interfaces
const baseWeightHistorySchema = {
  id: z.number(),
  weight: z.number(),
  weekStart: z.string(),
};

const baseExerciseWeightsSchema = {
  current: z.number(),
  previous: z.number().nullable(),
  history: z.array(z.object(baseWeightHistorySchema)),
};

const baseExerciseSchema = {
  exerciseId: z.number(),
  sets: z.string(),
  reps: z.string(),
  order: z.number(),
  notes: z.string().nullable(),
  restTime: z.number().nullable(),
};

// Interfaces
export interface WeightHistory {
  id: number;
  weight: number;
  weekStart: string;
}

export interface ExerciseWeights {
  current: number;
  previous: number | null;
  history: WeightHistory[];
}

export interface WorkoutExercise extends Pick<
  z.infer<typeof workoutExerciseSchema>,
  keyof typeof baseExerciseSchema
> {
  weights: ExerciseWeights;
}

export interface WorkoutDay {
  exercises: WorkoutExercise[];
}

export type WorkoutDays = Record<DayType, WorkoutDay>;

export interface WorkoutPlan {
  id: number;
  userId: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  notes: string | null;
  days: WorkoutDays;
}

// Zod Schemas
export const weightHistorySchema = z.object(baseWeightHistorySchema);

export const exerciseWeightsSchema = z.object(baseExerciseWeightsSchema);

export const workoutExerciseSchema = z.object({
  ...baseExerciseSchema,
  weights: exerciseWeightsSchema,
});

export const workoutDaySchema = z.object({
  exercises: z.array(workoutExerciseSchema),
});

// Input schemas
export const workoutExerciseInputSchema = z.object({
  ...baseExerciseSchema,
  initialWeight: z.number().default(0),
});

const basePlanSchema = {
  name: z.string().min(3).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().default(true),
  notes: z.string().nullable(),
};

export const workoutPlanInputSchema = z.object({
  ...basePlanSchema,
  userId: z.number(),
  days: z.record(
    z.enum(WORKOUT_DAYS),
    z.array(workoutExerciseInputSchema),
  ),
});

// Update schema - reusing base plan schema
export const updateWorkoutPlanSchema = z.object({
  name: basePlanSchema.name.optional(),
  startDate: basePlanSchema.startDate.optional(),
  endDate: basePlanSchema.endDate.optional(),
  isActive: basePlanSchema.isActive.optional(),
  notes: basePlanSchema.notes.optional(),
  days: z.record(
    z.enum(WORKOUT_DAYS),
    z.array(
      workoutExerciseInputSchema.extend({
        id: z.number().optional(),
      }),
    ),
  ).optional(),
});

// Response schema
export const workoutPlanResponseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  ...basePlanSchema,
  days: z.record(
    z.enum(WORKOUT_DAYS),
    workoutDaySchema,
  ),
});

// Helper functions
export function formatDate(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function ensureAllDaysPresent(days: Partial<WorkoutDays>): WorkoutDays {
  const fullDays = { ...days } as WorkoutDays;
  WORKOUT_DAYS.forEach((day) => {
    if (!fullDays[day]) {
      fullDays[day] = { exercises: [] };
    }
  });
  return fullDays;
}

export function transformDbToApiResponse(
  workoutPlan: any,
  days: Partial<Record<DayType, { exercises: any[] }>>,
): WorkoutPlan {
  const transformedDays = Object.entries(days).reduce((acc, [day, { exercises }]) => ({
    ...acc,
    [day]: {
      exercises: exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets,
        reps: ex.reps,
        order: ex.order,
        notes: ex.notes,
        restTime: ex.restTime,
        weights: {
          current: ex.weights.current,
          previous: ex.weights.previous,
          history: ex.weights.history,
        },
      })),
    },
  }), {} as Partial<WorkoutDays>);

  return {
    id: workoutPlan.id,
    userId: workoutPlan.userId,
    name: workoutPlan.name,
    startDate: formatDate(workoutPlan.startDate)!,
    endDate: formatDate(workoutPlan.endDate)!,
    isActive: Boolean(workoutPlan.isActive),
    notes: workoutPlan.notes,
    days: ensureAllDaysPresent(transformedDays),
  };
}
