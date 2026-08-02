import { pipe } from "@oofp/core/pipe";
import * as RTE from "@oofp/core/reader-task-either";
import type { Email, User } from "../domain/registration";
import type { RegistrationContext } from "./contracts";

type RepositoryContext = Pick<RegistrationContext, "userRepository">;
type NotifierContext = Pick<RegistrationContext, "welcomeNotifier">;

export const UserRepository = {
	findByEmail: (email: Email) =>
		pipe(
			RTE.ask<RepositoryContext>(),
			RTE.chaint(({ userRepository }) => userRepository.findByEmail(email)),
		),
	save: (user: User) =>
		pipe(
			RTE.ask<RepositoryContext>(),
			RTE.chaint(({ userRepository }) => userRepository.save(user)),
		),
};

export const WelcomeNotifier = {
	send: (user: User) =>
		pipe(
			RTE.ask<NotifierContext>(),
			RTE.chaint(({ welcomeNotifier }) => welcomeNotifier.send(user)),
		),
};
