import * as E from "@oofp/core/either";
import * as M from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";
import * as TE from "@oofp/core/task-either";
import type { UserRepository } from "../application/contracts";
import {
	EmailAlreadyRegisteredError,
	RegisterUserDto,
	type User,
	type UserId,
	UserRepositoryError,
} from "../domain/registration";

export type UserRow = Readonly<{
	id: string;
	name: string;
	email: string;
}>;

export type UserPersistenceClient = {
	findUserByEmail: (email: string) => Promise<UserRow | null>;
	insertUser: (user: UserRow) => Promise<UserRow>;
};

export type DatabaseUserRepositoryOptions = {
	isUniqueEmailViolation: (cause: unknown) => boolean;
};

const decodeUser = (row: UserRow): E.Either<UserRepositoryError, User> => {
	if (row.id.trim().length === 0) {
		return E.left(UserRepositoryError.from(new Error("Stored user id is invalid")));
	}
	return pipe(
		RegisterUserDto.parse(row),
		E.map(({ name, email }) => ({ id: row.id as UserId, name, email })),
		E.mapLeft(UserRepositoryError.from),
	);
};

const encodeUser = (user: User): UserRow => ({
	id: user.id,
	name: user.name,
	email: user.email,
});

export const createDatabaseUserRepository = (
	client: UserPersistenceClient,
	options: DatabaseUserRepositoryOptions,
): UserRepository => ({
	findByEmail: (email) =>
		pipe(
			TE.tryCatch(UserRepositoryError.from)(() => client.findUserByEmail(email)),
			TE.chain((row) =>
				row === null
					? TE.right(M.nothing<User>())
					: pipe(TE.fromEither(decodeUser(row)), TE.map(M.just)),
			),
		),
	save: (user) =>
		pipe(
			TE.tryCatch((cause) =>
				options.isUniqueEmailViolation(cause)
					? EmailAlreadyRegisteredError.of(user.email)
					: UserRepositoryError.from(cause),
			)(() => client.insertUser(encodeUser(user))),
			TE.chainw((row) => TE.fromEither(decodeUser(row))),
		),
});
