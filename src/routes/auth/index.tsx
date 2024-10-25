import { createRouter } from "@/lib/create-app";
import { login, loginHandler } from "@/routes/auth/log-in";
import { logout, logoutHandler } from "@/routes/auth/logout";

const router = createRouter()
  .openapi(
    login,
    loginHandler,
  )
  .openapi(
    logout,
    logoutHandler,
  );

export default router;
