import * as E from "@oofp/core/either";
import type { DomainError } from "@oofp/core/error";
import { makeDomainError } from "@oofp/core/error";
import { pipe } from "@oofp/core/pipe";

declare const emailBrand: unique symbol;
declare const userIdBrand: unique symbol;

export type Email = string & { readonly [emailBrand]: "Email" };
export type UserId = string & { readonly [userIdBrand]: "UserId" };

export type User = Readonly<{
	id: UserId;
	name: string;
	email: Email;
}>;

export type RegisterUserDto = Readonly<{
	name: string;
	email: Email;
}>;

export type ValidationError = DomainError<"ValidationError"> & {
	readonly field: "body" | "name" | "email";
};

export const ValidationError = {
	of: (field: ValidationError["field"], message: string): ValidationError => ({
		...makeDomainError("ValidationError", message),
		field,
	}),
};

const parseName = (value: unknown): E.Either<ValidationError, string> => {
	if (typeof value !== "string" || value.trim().length < 2) {
		return E.left(ValidationError.of("name", "Name must contain at least two characters"));
	}
	return E.right(value.trim());
};

const parseEmail = (value: unknown): E.Either<ValidationError, Email> => {
	if (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
		return E.left(ValidationError.of("email", "Email must be valid"));
	}
	return E.right(value.trim().toLowerCase() as Email);
};

const parseRegisterUserDto = (input: {
	readonly name: string;
	readonly email: string;
}): E.Either<ValidationError, RegisterUserDto> =>
	pipe(
		parseName(input.name),
		E.chain((name) =>
			pipe(
				parseEmail(input.email),
				E.map((email) => ({ name, email })),
			),
		),
	);

export const RegisterUserDto = { parse: parseRegisterUserDto };

export const Email = { parse: parseEmail };

export type EmailAlreadyRegisteredError = DomainError<"EmailAlreadyRegisteredError"> & {
	readonly email: Email;
};

export const EmailAlreadyRegisteredError = {
	of: (email: Email): EmailAlreadyRegisteredError => ({
		...makeDomainError("EmailAlreadyRegisteredError", `Email ${email} is already registered`),
		email,
	}),
};

export type UserRepositoryError = DomainError<"UserRepositoryError">;
export const UserRepositoryError = {
	from: (cause: unknown): UserRepositoryError =>
		makeDomainError("UserRepositoryError", "User storage is unavailable", cause),
};

export type NotificationError = DomainError<"NotificationError">;
export const NotificationError = {
	from: (cause: unknown): NotificationError =>
		makeDomainError("NotificationError", "Welcome notification could not be sent", cause),
};

export type RegistrationError = EmailAlreadyRegisteredError | UserRepositoryError;
