import { flow } from "@oofp/core/flow";
import * as R from "@oofp/core/reader";
import * as RTE from "@oofp/core/reader-task-either";
import type { RegistrationContext } from "./contracts";
import { registerUser } from "./register-user";

export const UserService = R.from((context: RegistrationContext) => ({
	register: flow(registerUser, RTE.run(context)),
}));

export type IUserService = ReturnType<typeof UserService>;
