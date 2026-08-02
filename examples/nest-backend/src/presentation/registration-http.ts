import {
	BadRequestException,
	ConflictException,
	type HttpException,
	InternalServerErrorException,
} from "@nestjs/common";
import type { RegistrationError, User, ValidationError } from "../domain/registration";

export type RegistrationHttpError = ValidationError | RegistrationError;

export const registrationErrorToHttp = (error: RegistrationHttpError): HttpException => {
	switch (error._tag) {
		case "ValidationError":
			return new BadRequestException({ message: error.message, field: error.field });
		case "EmailAlreadyRegisteredError":
			return new ConflictException({ message: error.message });
		case "UserRepositoryError":
			return new InternalServerErrorException({ message: "Unable to register user" });
	}
	return new InternalServerErrorException({ message: "Unable to register user" });
};

export const toPublicUser = (user: User) => ({ id: user.id, name: user.name, email: user.email });
