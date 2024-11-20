import { createRouter } from "@/lib/create-app";
import { createExercise, createExerciseHandler } from "@/routes/exercises/create-exercise";
import { getAllExercises, getAllExercisesHandler } from "@/routes/exercises/get-all-exercises";

const exerciseRouter = createRouter().openapi(
  createExercise,
  createExerciseHandler,
).openapi(
  getAllExercises,
  getAllExercisesHandler,
);
export default exerciseRouter;
