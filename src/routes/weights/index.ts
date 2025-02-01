import { createRouter } from "@/lib/create-app";
import { createWorkoutPlan, createWorkoutPlanHandler } from "@/routes/weights/create-workout-plan-for-user";
import { getWorkoutPlansHandler, getWorkoutPlansRoute } from "@/routes/weights/get-workout-plan-by-user-id";
import { updateWorkoutPlanHandler, updateWorkoutPlanRoute } from "@/routes/weights/update-workout-plan-by-id";

const router = createRouter()
  .openapi(createWorkoutPlan, createWorkoutPlanHandler)
  .openapi(
    getWorkoutPlansRoute,
    getWorkoutPlansHandler,
  )
  .openapi(updateWorkoutPlanRoute, updateWorkoutPlanHandler);

export default router;
