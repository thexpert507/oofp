import type * as M from "@oofp/core/maybe";
import type * as TE from "@oofp/core/task-either";
import type {
	Email,
	NotificationError,
	User,
	UserId,
	UserRepositoryError,
} from "../domain/registration";

export type UserRepository = {
	findByEmail: (email: Email) => TE.TaskEither<UserRepositoryError, M.Maybe<User>>;
	save: (user: User) => TE.TaskEither<UserRepositoryError, User>;
};

export type WelcomeNotifier = {
	send: (user: User) => TE.TaskEither<NotificationError, void>;
};

export type IdGenerator = { next: () => UserId };

export type AppLogger = {
	warn: (message: string, context?: Readonly<Record<string, unknown>>) => void;
};

export type RegistrationContext = {
	userRepository: UserRepository;
	welcomeNotifier: WelcomeNotifier;
	idGenerator: IdGenerator;
	logger: AppLogger;
};
