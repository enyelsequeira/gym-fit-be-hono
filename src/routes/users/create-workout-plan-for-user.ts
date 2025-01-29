import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContentRequired } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { workoutPlanDays, workoutPlans } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { isAdmin } from "@/middlewares/is-admin";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
type DayType = typeof DAYS[number];

// Input schemas
const exerciseInPlanSchema = z.object({
  exerciseId: z.number(),
  sets: z.string(),
  reps: z.string(),
  order: z.number(),
  notes: z.string().optional(),
  restTime: z.number().optional(),
});

const workoutPlanInputSchema = z.object({
  userId: z.number(),
  name: z.string().min(3).max(100),
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string().optional(),
  days: z.record(z.enum(DAYS), z.array(exerciseInPlanSchema)),
});

// Response schemas
const workoutPlanDayResponseSchema = z.object({
  id: z.number(),
  planId: z.number(),
  day: z.enum(DAYS),
  exerciseId: z.number(),
  sets: z.string(),
  reps: z.string(),
  order: z.number(),
  notes: z.string().nullable(),
  restTime: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

const successResponseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
  days: z.record(z.enum(DAYS), z.array(workoutPlanDayResponseSchema)),
});

const errorResponseSchema = z.object({
  message: z.string(),
  error: z.string(),
  field: z.string(),
});

type SuccessResponse = z.infer<typeof successResponseSchema>;
type ErrorResponse = z.infer<typeof errorResponseSchema>;

const createWorkoutPlan = createRoute({
  path: "/workout-plans/create",
  tags: ["Workout Plans"],
  method: "post",
  middleware: [isUserAuthenticated, isAdmin],
  request: {
    body: jsonContentRequired(
      workoutPlanInputSchema,
      "Workout plan to be created",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: successResponseSchema,
        },
      },
      description: "Successfully created workout plan",
    },
    [HttpStatusCodes.NOT_FOUND]: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "User or exercise not found",
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Validation error",
    },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Internal server error",
    },
  },
});

function formatDate(date: Date | null): string | null {
  if (!date)
    return null;
  return date.toISOString();
}

const createWorkoutPlanHandler: AppRouteHandler<typeof createWorkoutPlan> = async (c) => {
  const planData = c.req.valid("json");

  try {
    // Check if user exists
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, planData.userId),
    });

    if (!user) {
      const response: ErrorResponse = {
        message: "User not found",
        error: "USER_NOT_FOUND",
        field: "userId",
      };
      return c.json(response, HttpStatusCodes.NOT_FOUND);
    }

    // Validate exercises exist
    const exerciseIds = new Set(
      Object.values(planData.days)
        .flat()
        .map(exercise => exercise.exerciseId),
    );

    const existingExercises = await db.query.exercises.findMany({
      where: (exercises, { inArray }) =>
        inArray(exercises.id, Array.from(exerciseIds)),
    });

    if (existingExercises.length !== exerciseIds.size) {
      const response: ErrorResponse = {
        message: "One or more exercises not found",
        error: "EXERCISE_NOT_FOUND",
        field: "days",
      };
      return c.json(response, HttpStatusCodes.NOT_FOUND);
    }

    // Create workout plan and exercises
    const result = await db.transaction(async (tx) => {
      const [workoutPlan] = await tx
        .insert(workoutPlans)
        .values({
          userId: planData.userId,
          name: planData.name,
          startDate: new Date(planData.startDate),
          endDate: new Date(planData.endDate),
          notes: planData.notes ?? null,
          isActive: true,
        })
        .returning();

      const dayExercises = await Promise.all(
        Object.entries(planData.days).map(async ([day, exercises]) => {
          const insertedExercises = await Promise.all(
            exercises.map(async (exercise) => {
              const [inserted] = await tx
                .insert(workoutPlanDays)
                .values({
                  planId: workoutPlan.id,
                  day: day as DayType,
                  exerciseId: exercise.exerciseId,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  order: exercise.order,
                  notes: exercise.notes ?? null,
                  restTime: exercise.restTime ?? null,
                })
                .returning();

              return {
                ...inserted,
                createdAt: formatDate(inserted.createdAt)!,
                updatedAt: formatDate(inserted.updatedAt),
              };
            }),
          );
          return [day, insertedExercises] as const;
        }),
      );

      const response: SuccessResponse = {
        ...workoutPlan,
        createdAt: formatDate(workoutPlan.createdAt)!,
        updatedAt: formatDate(workoutPlan.updatedAt),
        startDate: formatDate(workoutPlan.startDate)!,
        endDate: formatDate(workoutPlan.endDate)!,
        days: Object.fromEntries(dayExercises),
      };

      return response;
    });

    return c.json(result, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Workout plan creation error:", error);

    const response: ErrorResponse = {
      message: "An unexpected error occurred",
      error: "UNKNOWN_ERROR",
      field: "unknown",
    };
    return c.json(response, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export { createWorkoutPlan, createWorkoutPlanHandler };
