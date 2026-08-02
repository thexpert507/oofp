import type { HttpException } from "@nestjs/common";
import { pipe } from "@oofp/core/pipe";
import * as TE from "@oofp/core/task-either";

export const toHttpPromise =
	<E>(mapError: (error: E) => HttpException) =>
	<A>(task: TE.TaskEither<E, A>): Promise<A> =>
		pipe(task, TE.mapLeft(mapError), TE.toPromise);
