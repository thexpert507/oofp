import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from "@nestjs/common";
import { pipe } from "@oofp/core/pipe";
import * as TE from "@oofp/core/task-either";
import type { IUserService } from "../application/user.service";
import { toHttpPromise } from "../shared/to-http-promise";
import { TOKENS } from "../tokens";
import { parseRegisterUserRequest } from "./register-user.request";
import { registrationErrorToHttp, toPublicUser } from "./registration-http";

@Controller("users")
export class UsersController {
	constructor(@Inject(TOKENS.UserService) private readonly users: IUserService) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	register(@Body() body: unknown) {
		return pipe(
			parseRegisterUserRequest(body),
			TE.fromEither,
			TE.chainw(this.users.register),
			TE.map(toPublicUser),
			toHttpPromise(registrationErrorToHttp),
		);
	}
}
