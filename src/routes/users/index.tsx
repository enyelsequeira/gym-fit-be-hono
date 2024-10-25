import { createRouter } from "@/lib/create-app";
import { createUser, createUserHandler } from "@/routes/users/create-user";
import { getMe, getMeHandler } from "@/routes/users/get-me";
import { listUser, userListHandler } from "@/routes/users/get-users";
import { updateUser, updateUserHandler } from "@/routes/users/update-user";

const router = createRouter()
  .openapi(
    listUser,
    userListHandler,
  )
  .openapi(createUser, createUserHandler)
  .openapi(getMe, getMeHandler)
  .openapi(updateUser, updateUserHandler);

export default router;
