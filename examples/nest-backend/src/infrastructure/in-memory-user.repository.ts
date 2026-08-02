import * as M from "@oofp/core/maybe";
import * as TE from "@oofp/core/task-either";
import type { UserRepository } from "../application/contracts";
import type { User } from "../domain/registration";

export const createInMemoryUserRepository = (): UserRepository => {
	const users = new Map<string, User>();
	return {
		findByEmail: (email) => TE.right(M.fromNullable(users.get(email))),
		save: (user) => {
			users.set(user.email, user);
			return TE.right(user);
		},
	};
};
