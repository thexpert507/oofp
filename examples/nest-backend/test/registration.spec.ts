import * as E from "@oofp/core/either";
import * as M from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";
import { describe, expect, it, vi } from "vitest";
import type { RegistrationContext } from "../src/application/contracts";
import { registerUser } from "../src/application/register-user";
import {
	type Email,
	NotificationError,
	RegisterUserDto,
	type User,
	type UserId,
	UserRepositoryError,
} from "../src/domain/registration";

const dto = { name: "Ada Lovelace", email: "ada@example.com" as Email };
const storedUser: User = { id: "user-1" as UserId, ...dto };

const createContext = (overrides: Partial<RegistrationContext> = {}): RegistrationContext => ({
	userRepository: {
		findByEmail: vi.fn(() => TE.right<UserRepositoryError, M.Maybe<User>>(M.nothing())),
		save: vi.fn(() => TE.right<UserRepositoryError, User>(storedUser)),
	},
	welcomeNotifier: { send: vi.fn(() => TE.right<NotificationError, void>(undefined)) },
	idGenerator: { next: vi.fn(() => storedUser.id) },
	logger: { warn: vi.fn() },
	...overrides,
});

const run = (context: RegistrationContext) => pipe(registerUser(dto), RTE.run(context), TE.run);

describe("RegisterUserDto", () => {
	it("normalizes a valid registration request", () => {
		const result = RegisterUserDto.parse({ name: "  Ada Lovelace  ", email: "ADA@EXAMPLE.COM" });
		expect(result).toEqual(E.right({ name: "Ada Lovelace", email: "ada@example.com" }));
	});

	it.each([
		[null, "body"],
		[{ name: "A", email: "ada@example.com" }, "name"],
		[{ name: "Ada", email: "not-an-email" }, "email"],
	])("returns a typed validation error for %j", (input, field) => {
		const result = RegisterUserDto.parse(input);
		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) expect(result.value.field).toBe(field);
	});
});

describe("registerUser", () => {
	it("persists the user and sends the welcome notification", async () => {
		const context = createContext();
		const result = await run(context);

		expect(result).toEqual(E.right(storedUser));
		expect(context.userRepository.save).toHaveBeenCalledWith(storedUser);
		expect(context.welcomeNotifier.send).toHaveBeenCalledWith(storedUser);
	});

	it("short-circuits when the email is already registered", async () => {
		const context = createContext({
			userRepository: {
				findByEmail: vi.fn(() => TE.right<UserRepositoryError, M.Maybe<User>>(M.just(storedUser))),
				save: vi.fn(() => TE.right<UserRepositoryError, User>(storedUser)),
			},
		});
		const result = await run(context);

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) expect(result.value._tag).toBe("EmailAlreadyRegisteredError");
		expect(context.userRepository.save).not.toHaveBeenCalled();
		expect(context.welcomeNotifier.send).not.toHaveBeenCalled();
	});

	it("keeps repository failures in the error channel", async () => {
		const error = UserRepositoryError.from(new Error("database offline"));
		const context = createContext({
			userRepository: {
				findByEmail: vi.fn(() => TE.left<UserRepositoryError, M.Maybe<User>>(error)),
				save: vi.fn(() => TE.right<UserRepositoryError, User>(storedUser)),
			},
		});
		const result = await run(context);

		expect(result).toEqual(E.left(error));
		expect(context.userRepository.save).not.toHaveBeenCalled();
	});

	it("logs and absorbs notification failures", async () => {
		const notificationError = NotificationError.from(new Error("mail provider offline"));
		const context = createContext({
			welcomeNotifier: { send: vi.fn(() => TE.left<NotificationError, void>(notificationError)) },
		});
		const result = await run(context);

		expect(result).toEqual(E.right(storedUser));
		expect(context.logger.warn).toHaveBeenCalledWith(notificationError.message, {
			tag: notificationError._tag,
			userId: storedUser.id,
		});
	});
});
