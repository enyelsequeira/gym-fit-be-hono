import { createRoute, z } from "@hono/zod-openapi";
import { asc, desc, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";
import type { DayType } from "@/routes/weights/helpers";

import { basicErrorSchema } from "@/common/response-schemas";
import db from "@/db";
import { exerciseWeights, UserType, WORKOUT_DAYS, workoutPlanDays, workoutPlans } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { formatDate } from "@/routes/weights/helpers";

// Response schemas
const weightHistorySchema = z.object({
  id: z.number(),
  weight: z.number(),
  weekStart: z.string(),
});

const exerciseWeightsSchema = z.object({
  current: z.number().nullable(),
  previous: z.number().nullable(),
  history: z.array(weightHistorySchema),
});

const workoutExerciseSchema = z.object({
  exerciseId: z.number(),
  sets: z.string(),
  reps: z.string(),
  order: z.number(),
  notes: z.string().nullable(),
  restTime: z.number().nullable(),
  weights: exerciseWeightsSchema,
});

const workoutDaySchema = z.object({
  exercises: z.array(workoutExerciseSchema),
});

const workoutPlanSchema = z.object({
  id: z.number(),
  userId: z.number(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean(),
  notes: z.string().nullable(),
  days: z.record(z.enum(WORKOUT_DAYS), workoutDaySchema),
});

const getWorkoutPlansRoute = createRoute({
  path: "/workout-plans/user/{userId}",
  tags: ["Workout Plans"],
  method: "get",
  middleware: [isUserAuthenticated],
  request: {
    params: z.object({
      userId: z.coerce.number(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      workoutPlanSchema.array(),
      "Successfully retrieved workout plans",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      basicErrorSchema,
      "User not authenticated",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      basicErrorSchema,
      "Not authorized to view these workout plans",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      basicErrorSchema,
      "User not found",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      basicErrorSchema,
      "Internal server error",
    ),
  },
});

const getWorkoutPlansHandler: AppRouteHandler<typeof getWorkoutPlansRoute> = async (c) => {
  try {
    const currentUser = c.get("user");
    const { userId } = c.req.valid("param");

    console.log("[GetWorkoutPlans] Request details:", {
      currentUserId: currentUser?.id,
      targetUserId: userId,
    });

    // Security check: only admins or the user themselves can view workout plans
    const isAdmin = currentUser?.type === UserType.ADMIN;
    const isOwnUser = currentUser?.id === userId;

    if (!isAdmin && !isOwnUser) {
      console.log("[GetWorkoutPlans] Unauthorized access attempt");
      return c.json(
        {
          success: false,
          error: {
            message: "Not authorized to view these workout plans",
            name: "Forbidden",
          },
        },
        HttpStatusCodes.FORBIDDEN,
      );
    }

    // Get workout plans with exercises and weights
    const plans = await db.query.workoutPlans.findMany({
      where: eq(workoutPlans.userId, userId),
      with: {
        days: {
          with: {
            exercise: true,
            weights: {
              orderBy: desc(exerciseWeights.weekStart),
              limit: 2,
            },
          },
          orderBy: [asc(workoutPlanDays.order)],
        },
      },
      orderBy: [desc(workoutPlans.createdAt)],
    });

    // Transform plans to the desired format
    const formattedPlans = plans.map((plan) => {
      // Group exercises by day
      const dayExercises = plan.days.reduce((acc, day) => {
        const dayName = day.day as DayType;
        if (!acc[dayName]) {
          acc[dayName] = { exercises: [] };
        }

        acc[dayName].exercises.push({
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
              weekStart: formatDate(w.weekStart)!,
            })),
          },
        });

        return acc;
      }, {} as Record<DayType, { exercises: any[] }>);

      // Ensure all days are present
      WORKOUT_DAYS.forEach((day) => {
        if (!dayExercises[day]) {
          dayExercises[day] = { exercises: [] };
        }
      });

      return {
        id: plan.id,
        userId: plan.userId,
        name: plan.name,
        startDate: formatDate(plan.startDate)!,
        endDate: formatDate(plan.endDate)!,
        isActive: Boolean(plan.isActive),
        notes: plan.notes,
        days: dayExercises,
      };
    });

    console.log("[GetWorkoutPlans] Successfully retrieved plans:", {
      userId,
      planCount: formattedPlans.length,
    });

    return c.json(formattedPlans, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("[GetWorkoutPlans] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return c.json(
      {
        success: false,
        error: {
          message: "Error retrieving workout plans",
          name: error instanceof Error ? error.message : "Unknown error",
        },
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export { getWorkoutPlansHandler, getWorkoutPlansRoute };
