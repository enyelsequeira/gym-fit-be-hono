import configureOpenAPI from "@/lib/configure-open-api";
import createApp from "@/lib/create-app";
import login from "@/routes/auth";
import exerciseRouter from "@/routes/exercises";
import foodRouter from "@/routes/foods";
import index from "@/routes/index.route";
import users from "@/routes/users";

const app = createApp();

configureOpenAPI(app);

const routes = [
  index,
  users,
  login,
  foodRouter,
  exerciseRouter,
] as const;

routes.forEach((route) => {
  app.route("/", route);
});

export type AppType = typeof routes[number];

export default app;
