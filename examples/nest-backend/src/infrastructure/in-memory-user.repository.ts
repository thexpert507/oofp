import * as M from "@oofp/core/maybe";
import * as TE from "@oofp/core/task-either";
import type { UserRepository } from "../application/contracts";
import { EmailAlreadyRegisteredError, type User } from "../domain/registration";

export const createInMemoryUserRepository = (): UserRepository => {
	const users = new Map<string, User>();
	return {
		findByEmail: (email) => TE.right(M.fromNullable(users.get(email))),
		save: (user) => {
			if (users.has(user.email)) {
				return TE.left(EmailAlreadyRegisteredError.of(user.email));
			}
			users.set(user.email, user);
			return TE.right(user);
		},
	};
};
