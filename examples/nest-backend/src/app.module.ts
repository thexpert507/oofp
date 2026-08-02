import { Module } from "@nestjs/common";
import { UserService } from "./application/user.service";
import { idGenerator, logger, welcomeNotifier } from "./infrastructure/console.adapters";
import { createInMemoryUserRepository } from "./infrastructure/in-memory-user.repository";
import { UsersController } from "./presentation/users.controller";
import { provideReader } from "./shared/provide-reader";
import { TOKENS } from "./tokens";

const provideUserService = provideReader({
	provide: TOKENS.UserService,
	reader: UserService,
	context: {
		userRepository: TOKENS.UserRepository,
		welcomeNotifier: TOKENS.WelcomeNotifier,
		idGenerator: TOKENS.IdGenerator,
		logger: TOKENS.Logger,
	},
});

@Module({
	controllers: [UsersController],
	providers: [
		{ provide: TOKENS.UserRepository, useFactory: createInMemoryUserRepository },
		{ provide: TOKENS.WelcomeNotifier, useValue: welcomeNotifier },
		{ provide: TOKENS.IdGenerator, useValue: idGenerator },
		{ provide: TOKENS.Logger, useValue: logger },
		provideUserService,
	],
})
export class AppModule {}
