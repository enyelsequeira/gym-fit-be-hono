import { createRouter } from "@/lib/create-app";
import { changePassword, changePasswordHandler } from "@/routes/users/change-users-password";
import { createUser, createUserHandler } from "@/routes/users/create-user";
import { getMe, getMeHandler } from "@/routes/users/get-me";
import { getUserById, getUserByIdHandler } from "@/routes/users/get-user-by-id";
import { getUserWeights, getUserWeightsHandler } from "@/routes/users/get-user-weights";
import { listUser, userListHandler } from "@/routes/users/get-users";
import { updateUser, updateUserHandler } from "@/routes/users/update-user";

const router = createRouter()
  .openapi(
    listUser,
    userListHandler,
  )
  .openapi(createUser, createUserHandler)
  .openapi(getMe, getMeHandler)
  .openapi(updateUser, updateUserHandler)
  .openapi(
    getUserWeights,
    getUserWeightsHandler,
  )
  .openapi(changePassword, changePasswordHandler)
  .openapi(
    getUserById,
    getUserByIdHandler,
  );

export default router;
