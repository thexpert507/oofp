/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind3, URIS3 } from "@/URIS3";
import { Applicative3 } from "@/applicative";
import { Delayable3 } from "@/delayable";
import { id } from "@/id";
import * as L from "@/list";
import { Monad3 } from "@/monad";
import { pipe } from "@/pipe";
import type { EnsureKinds3, UnionToIntersection } from "./hkt-inference";

// Tipo de la instancia de la mónada
type Instance<F extends URIS3> = Monad3<F> & Applicative3<F> & Delayable3<F>;

// Tipo para los valores que contiene cada mónada, como un array de `Kind3<F, R, E, A>`
type VOK<F extends URIS3, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind3<F, infer _R, infer _E, infer A> ? A : never;
};

type Contexts<F extends URIS3, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind3<F, infer R, infer _E, infer _A> ? R : never;
};

type Errors<F extends URIS3, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind3<F, infer _R, infer E, infer _A> ? E : never;
};

// Extrae y combina todos los contextos R1 & R2 & R3 & ...
type UnionR<F extends URIS3, Args extends unknown[]> = UnionToIntersection<
	Contexts<F, Args>[number]
>;

// Extrae y une todos los tipos de error E1 | E2 | E3 | ...
type UnionE<F extends URIS3, Args extends unknown[]> = Errors<F, Args>[number];

type Config = { concurrency?: number; delay?: number };

const reduceFn =
	<F extends URIS3>(mo: Instance<F>) =>
	<R, E, Args extends unknown[]>(
		acc: Kind3<F, R, E, VOK<F, Args>>,
		curr: Kind3<F, R, E, unknown>,
	) => {
		const merge =
			<A>(result: A) =>
			(values: VOK<F, Args>): VOK<F, Args> =>
				[...values, result] as VOK<F, Args>;
		return pipe(acc, mo.apply(pipe(curr, mo.map(merge)))) as Kind3<F, R, E, VOK<F, Args>>;
	};

/**
 * Ejecuta un array de mónadas Kind3 con control de concurrencia y delay opcional.
 * Procesa las mónadas en lotes del tamaño especificado en la configuración.
 * TypeScript infiere automáticamente:
 * - El contexto R como intersección de todos los contextos: R1 & R2 & R3
 * - El error E como unión de todos los errores: E1 | E2 | E3
 *
 * @example
 * ```typescript
 * import * as RTE from './reader-task-either'
 * import { concurrency3 } from './utils'
 *
 * type Config = { apiUrl: string }
 * type Logger = { log: (msg: string) => void }
 *
 * const tasks = [
 *   RTE.of<Config, string, number>(1),
 *   RTE.of<Logger, Error, string>('hello'),
 *   RTE.of<Config, boolean, boolean>(true)
 * ]
 *
 * // Ejecuta 2 tareas a la vez con 1 segundo de delay entre lotes
 * const result = concurrency3(RTE.RTE)({ concurrency: 2, delay: 1000 })(tasks)
 * // ReaderTaskEither<Config & Logger, string | Error | boolean, [number, string, boolean]>
 * ```
 */
export const concurrency3 =
	<F extends URIS3>(mo: Instance<F>) =>
	(config?: Config) =>
	<const Args extends unknown[]>(
		args: Args,
		..._validation: Args extends EnsureKinds3<F, Args> ? [] : [invalid: never]
	): Kind3<F, UnionR<F, Args>, UnionE<F, Args>, VOK<F, Args>> => {
		type R = UnionR<F, Args>;
		type E = UnionE<F, Args>;

		if (L.isEmpty(args)) return mo.of<R, E, VOK<F, Args>>([] as unknown as VOK<F, Args>);

		let acc = mo.of<R, E, VOK<F, Args>>([] as unknown as VOK<F, Args>);
		let remaining: Args = args;
		const concurrencyNumber = config?.concurrency ?? args.length;

		// Usar iteración en lugar de recursión para evitar fugas de memoria
		while (remaining.length > 0) {
			const portion = remaining.slice(0, concurrencyNumber) as Args;
			remaining = remaining.slice(concurrencyNumber) as Args;

			acc = pipe(
				acc,
				config?.delay ? mo.delay(config.delay) : id(),
				mo.chain((values) =>
					pipe(
						portion as unknown as Kind3<F, R, E, unknown>[],
						L.reduce(mo.of(values), reduceFn(mo)),
					),
				),
			);
		}

		return acc;
	};
