/**
 * Utilidades funcionales para medir performance en monadas lazy
 */
import { pipe } from "@oofp/core/pipe";
import * as TE from "@oofp/core/task-either";
import * as E from "@oofp/core/either";

type TimedValue<R> = { duration: number; value: R };

/**
 * Ejecuta un TaskEither midiendo su tiempo de ejecución
 *
 * La medición se realiza correctamente dentro del thunk,
 * respetando la naturaleza lazy de TaskEither.
 *
 * @param task El TaskEither a ejecutar y medir
 * @param onComplete Callback que recibe la duración (ms) y el resultado
 * @returns Un nuevo TaskEither con el timing instrumentado
 */
export const withTiming = <L, R>(task: TE.TaskEither<L, R>): TE.TaskEither<L, TimedValue<R>> => {
	return async () => {
		const start = performance.now();
		const result = await task();
		const duration = performance.now() - start;
		return pipe(
			result,
			E.map((value) => ({ duration, value })),
		);
	};
};
