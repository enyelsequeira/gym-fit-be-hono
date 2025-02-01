import { createRoute, z } from "@hono/zod-openapi";
import { and, desc, eq, inArray } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContentRequired } from "stoker/openapi/helpers";

import type { WORKOUT_DAYS } from "@/db/schema";
import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { exercises, exerciseWeights, users, workoutPlanDays, workoutPlans } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { isAdmin } from "@/middlewares/is-admin";
import { transformDbToApiResponse, workoutPlanInputSchema, workoutPlanResponseSchema } from "@/routes/weights/helpers";

export type DayType = typeof WORKOUT_DAYS[number];

const errorResponseSchema = z.object({
  message: z.string(),
  error: z.string(),
  field: z.string(),
});

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
          schema: workoutPlanResponseSchema,
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

const createWorkoutPlanHandler: AppRouteHandler<typeof createWorkoutPlan> = async (c) => {
  const planData = c.req.valid("json");

  try {
    // Validate user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, planData.userId),
    });

    if (!user) {
      return c.json({
        message: "User not found",
        error: "USER_NOT_FOUND",
        field: "userId",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Validate all exercises exist
    const exerciseIds = Array.from(new Set(
      Object.values(planData.days)
        .flat()
        .map(ex => ex.exerciseId),
    ));

    const existingExercises = await db.query.exercises.findMany({
      where: inArray(exercises.id, exerciseIds),
    });

    if (existingExercises.length !== exerciseIds.length) {
      return c.json({
        message: "One or more exercises not found",
        error: "EXERCISE_NOT_FOUND",
        field: "days",
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Create workout plan with weight tracking
    const result = await db.transaction(async (tx) => {
      // Create the base workout plan
      const [workoutPlan] = await tx.insert(workoutPlans).values({
        userId: planData.userId,
        name: planData.name,
        startDate: planData.startDate,
        endDate: planData.endDate,
        notes: planData.notes ?? null,
        isActive: planData.isActive ?? true,
      }).returning();

      const weekStart = new Date(planData.startDate);
      weekStart.setHours(0, 0, 0, 0);

      // Create exercises for each day
      const daysData = await Promise.all(
        Object.entries(planData.days).map(async ([day, exercises]) => {
          const dayKey = day as DayType;

          const dayExercises = await Promise.all(
            exercises.map(async (exercise, index) => {
              // Create workout plan day entry
              const [planDay] = await tx.insert(workoutPlanDays).values({
                planId: workoutPlan.id,
                day: day as DayType,
                exerciseId: exercise.exerciseId,
                sets: exercise.sets,
                reps: exercise.reps,
                order: exercise.order ?? index + 1, // Use provided order or index + 1
                notes: exercise.notes ?? null,
                restTime: exercise.restTime ?? null,
              }).returning();

              // Get historical weights for this exercise
              const previousWeights = await tx.query.exerciseWeights.findMany({
                where: and(
                  eq(exerciseWeights.userId, planData.userId),
                  eq(exerciseWeights.planDayId, planDay.id),
                ),
                orderBy: desc(exerciseWeights.weekStart),
              });

              // Create initial weight entry
              const [newWeight] = await tx.insert(exerciseWeights).values({
                userId: planData.userId,
                planDayId: planDay.id,
                weight: exercise.initialWeight,
                weekStart,
              }).returning();

              // Build exercise data structure matching our WorkoutExercise interface
              return {
                exerciseId: exercise.exerciseId,
                sets: exercise.sets,
                reps: exercise.reps,
                order: planDay.order,
                notes: planDay.notes,
                restTime: planDay.restTime,
                weights: {
                  current: newWeight.weight,
                  previous: previousWeights[0]?.weight ?? null,
                  history: [newWeight, ...previousWeights].map(w => ({
                    id: w.id,
                    weight: w.weight,
                    weekStart: w.weekStart.toISOString(),
                  })),
                },
              };
            }),
          );

          // Return properly structured day data
          return [dayKey, { exercises: dayExercises }] as const;
        }),
      );

      // Add some logging to help debug the transformation
      console.log("Workout Plan:", JSON.stringify(workoutPlan, null, 2));
      console.log("Days Data:", JSON.stringify(Object.fromEntries(daysData), null, 2));

      // Transform the complete workout plan to API response format
      return transformDbToApiResponse(workoutPlan, Object.fromEntries(daysData));
    });

    return c.json(result, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Workout plan creation error:", error);
    return c.json({
      message: "An unexpected error occurred",
      error: "INTERNAL_SERVER_ERROR",
      field: "unknown",
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export { createWorkoutPlan, createWorkoutPlanHandler };
