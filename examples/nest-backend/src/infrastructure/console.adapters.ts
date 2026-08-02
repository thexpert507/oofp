import { randomUUID } from "node:crypto";
import * as TE from "@oofp/core/task-either";
import type { AppLogger, IdGenerator, WelcomeNotifier } from "../application/contracts";
import { NotificationError, type UserId } from "../domain/registration";

export const idGenerator: IdGenerator = { next: () => randomUUID() as UserId };

export const logger: AppLogger = {
	warn: (message, context) => console.warn(message, context),
};

export const welcomeNotifier: WelcomeNotifier = {
	send: (user) =>
		pipeNotification(() => console.info(`Welcome notification sent to ${user.email}`)),
};

const pipeNotification = (effect: () => void) =>
	TE.tryCatch(NotificationError.from)(async () => {
		effect();
	});
