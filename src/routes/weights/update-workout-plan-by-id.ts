import { createRoute, z } from "@hono/zod-openapi";
import dayjs from "dayjs";
import { asc, desc, eq, inArray } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContentRequired } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";
import type { DayType } from "@/routes/weights/helpers";

import db from "@/db";
import { exerciseWeights, workoutPlanDays, workoutPlans } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { isAdmin } from "@/middlewares/is-admin";
import { transformDbToApiResponse, updateWorkoutPlanSchema, workoutPlanResponseSchema } from "@/routes/weights/helpers";

const errorResponseSchema = z.object({
  message: z.string(),
  error: z.string(),
  field: z.string().optional(),
});

const updateWorkoutPlanRoute = createRoute({
  path: "/workout-plans/{id}",
  tags: ["Workout Plans"],
  method: "patch",
  middleware: [isUserAuthenticated, isAdmin],
  request: {
    params: z.object({
      id: z.coerce.number(),
    }),
    body: jsonContentRequired(
      updateWorkoutPlanSchema,
      "Workout plan updates",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: workoutPlanResponseSchema, // Using our existing response schema
        },
      },
      description: "Successfully updated workout plan",
    },
    [HttpStatusCodes.NOT_FOUND]: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Workout plan not found",
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

const updateWorkoutPlanHandler: AppRouteHandler<typeof updateWorkoutPlanRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updateData = c.req.valid("json");

  try {
    // Verify plan exists with relationships
    const existingPlan = await db.query.workoutPlans.findFirst({
      where: eq(workoutPlans.id, id),
      with: {
        days: {
          with: {
            exercise: true,
            weights: {
              orderBy: desc(exerciseWeights.weekStart),
              limit: 2,
            },
          },
          orderBy: asc(workoutPlanDays.order),
        },
      },
    });

    if (!existingPlan) {
      return c.json({
        message: "Workout plan not found",
        error: "PLAN_NOT_FOUND",
        field: "id",
      }, HttpStatusCodes.NOT_FOUND);
    }

    const result = await db.transaction(async (tx) => {
      // Update main plan details
      await tx.update(workoutPlans)
        .set({
          name: updateData.name ?? existingPlan.name,
          startDate: updateData.startDate ?? existingPlan.startDate,
          endDate: updateData.endDate ?? existingPlan.endDate,
          isActive: updateData.isActive ?? existingPlan.isActive,
          notes: updateData.notes ?? existingPlan.notes,
        })
        .where(eq(workoutPlans.id, id));

      // Process days updates if provided
      if (updateData.days) {
        // Create a map of existing days by their IDs for quick lookup
        const existingDayMap = new Map(
          existingPlan.days.map(day => [day.id, day]),
        );

        // Create a map of days being updated
        const updatedDays = new Set(Object.keys(updateData.days));

        // Track which day IDs we're keeping
        const keepDayIds = new Set<number>();

        // Process updates for provided days
        const updatedDaysData = await Promise.all(
          Object.entries(updateData.days).map(async ([day, exercises]) => {
            const dayExercises = await Promise.all(
              exercises.map(async (exercise) => {
                let planDay;

                if (exercise.id) {
                  // Update existing day
                  keepDayIds.add(exercise.id);
                  [planDay] = await tx.update(workoutPlanDays)
                    .set({
                      day: day as DayType,
                      sets: exercise.sets,
                      reps: exercise.reps,
                      order: exercise.order,
                      notes: exercise.notes ?? null,
                      restTime: exercise.restTime ?? null,
                    })
                    .where(eq(workoutPlanDays.id, exercise.id))
                    .returning();

                  // Fetch the weights for this plan day
                  const weights = await tx.query.exerciseWeights.findMany({
                    where: eq(exerciseWeights.planDayId, planDay.id),
                    orderBy: desc(exerciseWeights.weekStart),
                    limit: 2,
                  });

                  return {
                    exerciseId: exercise.exerciseId,
                    sets: exercise.sets,
                    reps: exercise.reps,
                    order: exercise.order,
                    notes: exercise.notes ?? null,
                    restTime: exercise.restTime ?? null,
                    weights: {
                      current: weights[0]?.weight ?? null,
                      previous: weights[1]?.weight ?? null,
                      history: weights.map(w => ({
                        id: w.id,
                        weight: w.weight,
                        weekStart: w.weekStart.toISOString(),
                      })),
                    },
                  };
                }
                else {
                  // Create new day
                  [planDay] = await tx.insert(workoutPlanDays)
                    .values({
                      planId: id,
                      day: day as DayType,
                      exerciseId: exercise.exerciseId,
                      sets: exercise.sets,
                      reps: exercise.reps,
                      order: exercise.order,
                      notes: exercise.notes ?? null,
                      restTime: exercise.restTime ?? null,
                    })
                    .returning();
                }

                // Handle weight updates
                if (exercise.initialWeight) {
                  const [newWeight] = await tx.insert(exerciseWeights)
                    .values({
                      userId: existingPlan.userId,
                      planDayId: planDay.id,
                      weight: exercise.initialWeight,
                      weekStart: dayjs(updateData.startDate ?? existingPlan.startDate)
                        .startOf("week")
                        .toDate(),
                    })
                    .returning();

                  // Get previous weights
                  const previousWeights = await tx.query.exerciseWeights.findMany({
                    where: eq(exerciseWeights.planDayId, planDay.id),
                    orderBy: desc(exerciseWeights.weekStart),
                    limit: 2,
                  });

                  return {
                    exerciseId: exercise.exerciseId,
                    sets: exercise.sets,
                    reps: exercise.reps,
                    order: exercise.order,
                    notes: exercise.notes ?? null,
                    restTime: exercise.restTime ?? null,
                    weights: {
                      current: newWeight.weight,
                      previous: previousWeights[1]?.weight ?? null,
                      history: [newWeight, ...previousWeights].map(w => ({
                        id: w.id,
                        weight: w.weight,
                        weekStart: w.weekStart.toISOString(),
                      })),
                    },
                  };
                }

                // For new exercises without initial weight
                return {
                  exerciseId: exercise.exerciseId,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  order: exercise.order,
                  notes: exercise.notes ?? null,
                  restTime: exercise.restTime ?? null,
                  weights: {
                    current: null,
                    previous: null,
                    history: [],
                  },
                };
              }),
            );

            return [day, { exercises: dayExercises }] as const;
          }),
        );

        // Process existing days that weren't updated
        const existingDaysData = await Promise.all(
          existingPlan.days
            .filter(day => !updatedDays.has(day.day))
            .map(async (day) => {
              // Skip if this day's exercises are being moved
              if (keepDayIds.has(day.id)) {
                return null;
              }

              return [
                day.day,
                {
                  exercises: [{
                    exerciseId: day.exerciseId,
                    sets: day.sets,
                    reps: day.reps,
                    order: day.order,
                    notes: day.notes,
                    restTime: day.restTime,
                    weights: {
                      current: day.weights[0]?.weight ?? null,
                      previous: day.weights[1]?.weight ?? null,
                      history: day.weights.map(w => ({
                        id: w.id,
                        weight: w.weight,
                        weekStart: w.weekStart.toISOString(),
                      })),
                    },
                  }],
                },
              ] as const;
            }),
        );

        // Combine updated and existing days data
        const allDaysData = [
          ...updatedDaysData,
          ...existingDaysData.filter((data): data is NonNullable<typeof data> => data !== null),
        ];

        // Delete any days that weren't kept
        const daysToDelete = Array.from(existingDayMap.keys())
          .filter(id => !keepDayIds.has(id)
            && !existingDaysData.some(data =>
              data && existingDayMap.get(id)?.day === data[0],
            ),
          );

        if (daysToDelete.length > 0) {
          // First delete associated weights
          await tx.delete(exerciseWeights)
            .where(inArray(exerciseWeights.planDayId, daysToDelete));

          // Then delete the workout plan days
          await tx.delete(workoutPlanDays)
            .where(inArray(workoutPlanDays.id, daysToDelete));
        }

        // Fetch the updated plan
        const updatedPlan = await tx.query.workoutPlans.findFirst({
          where: eq(workoutPlans.id, id),
        });

        if (!updatedPlan) {
          throw new Error("Failed to fetch updated plan");
        }

        // Transform and return the response
        return transformDbToApiResponse(
          updatedPlan,
          Object.fromEntries(allDaysData),
        );
      }

      // If no days were updated, return the existing plan structure
      return transformDbToApiResponse(
        existingPlan,
        Object.fromEntries(
          Object.entries(existingPlan.days.reduce((acc, day) => {
            const dayKey = day.day as DayType;
            acc[dayKey] = acc[dayKey] || [];
            acc[dayKey].push({
              exerciseId: day.exerciseId,
              sets: day.sets,
              reps: day.reps,
              order: day.order,
              notes: day.notes,
              restTime: day.restTime,
              weights: {
                current: day.weights[0]?.weight ?? null,
                previous: day.weights[1]?.weight ?? null,
                history: day.weights.map(w => ({
                  id: w.id,
                  weight: w.weight,
                  weekStart: w.weekStart.toISOString(),
                })),
              },
            });
            return acc;
          }, {} as Record<DayType, any[]>)),
        ),
      );
    });

    return c.json(result, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Error updating workout plan:", error);
    return c.json({
      message: error instanceof Error ? error.message : "An unexpected error occurred",
      error: "INTERNAL_SERVER_ERROR",
      field: "unknown",
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export { updateWorkoutPlanHandler, updateWorkoutPlanRoute };
