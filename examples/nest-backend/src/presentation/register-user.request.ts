import * as E from "@oofp/core/either";
import { pipe } from "@oofp/core/pipe";
import { z } from "zod";
import {
	RegisterUserDto,
	type ValidationError,
	ValidationError as ValidationErrorValue,
} from "../domain/registration";

export const registerUserRequestSchema = z.strictObject({
	name: z.string().trim().min(2, "Name must contain at least two characters"),
	email: z.string().trim().toLowerCase().email("Email must be valid"),
});

const issueField = (path: PropertyKey[]): ValidationError["field"] => {
	const field = path[0];
	return field === "name" || field === "email" ? field : "body";
};

export const parseRegisterUserRequest = (
	input: unknown,
): E.Either<ValidationError, RegisterUserDto> => {
	const parsed = registerUserRequestSchema.safeParse(input);
	if (!parsed.success) {
		const issue = parsed.error.issues[0];
		return E.left(
			ValidationErrorValue.of(
				issue ? issueField(issue.path) : "body",
				issue?.message ?? "Request body is invalid",
			),
		);
	}

	return pipe(parsed.data, RegisterUserDto.parse);
};
