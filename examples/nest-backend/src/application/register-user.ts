import * as M from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";
import {
	EmailAlreadyRegisteredError,
	type RegisterUserDto,
	type RegistrationError,
	type User,
} from "../domain/registration";
import type { RegistrationContext } from "./contracts";
import { UserRepository, WelcomeNotifier } from "./service-accessors";

const assertEmailAvailable = (dto: RegisterUserDto) =>
	pipe(
		UserRepository.findByEmail(dto.email),
		RTE.chaint(
			M.fold(
				() => TE.right<EmailAlreadyRegisteredError, RegisterUserDto>(dto),
				() =>
					TE.left<EmailAlreadyRegisteredError, RegisterUserDto>(
						EmailAlreadyRegisteredError.of(dto.email),
					),
			),
		),
	);

const buildUser = (dto: RegisterUserDto) =>
	pipe(
		RTE.ask<Pick<RegistrationContext, "idGenerator">>(),
		RTE.map(({ idGenerator }): User => ({ id: idGenerator.next(), ...dto })),
	);

const sendWelcomeSoftFail = (
	user: User,
): RTE.ReaderTaskEither<Pick<RegistrationContext, "welcomeNotifier" | "logger">, never, void> =>
	pipe(
		WelcomeNotifier.send(user),
		RTE.tapLeftRTE((error) =>
			pipe(
				RTE.ask<Pick<RegistrationContext, "logger">>(),
				RTE.tap(({ logger }) => logger.warn(error.message, { tag: error._tag, userId: user.id })),
				RTE.toVoid,
			),
		),
		RTE.orElse(() =>
			RTE.of<Pick<RegistrationContext, "welcomeNotifier" | "logger">, void>(undefined),
		),
	);

export const registerUser = (
	dto: RegisterUserDto,
): RTE.ReaderTaskEither<RegistrationContext, RegistrationError, User> =>
	pipe(
		RTE.of(dto),
		RTE.chainwc(assertEmailAvailable),
		RTE.chainwc(buildUser),
		RTE.chainwc(UserRepository.save),
		RTE.tapRTE(sendWelcomeSoftFail),
	);
