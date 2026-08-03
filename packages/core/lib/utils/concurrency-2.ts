/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind2, URIS2 } from "@/URIS2";
import { Applicative2 } from "@/applicative";
import { Delayable2 } from "@/delayable";
import { id } from "@/id";
import * as L from "@/list";
import { Monad2 } from "@/monad";
import { pipe } from "@/pipe";
import type { EnsureKinds2 } from "./hkt-inference";

// Tipo de la instancia de la mónada
type Instance<F extends URIS2> = Monad2<F> & Applicative2<F> & Delayable2<F>;

// Tipo para los valores que contiene cada mónada, como un array de `Kind2<F,E,A>`
type VOK<F extends URIS2, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind2<F, infer _E, infer A> ? A : never;
};

// Extrae y une todos los tipos de error E1 | E2 | E3 | ...
type Errors<F extends URIS2, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind2<F, infer E, infer _A> ? E : never;
};
type UnionE<F extends URIS2, Args extends unknown[]> = Errors<F, Args>[number];

type Config = { concurrency?: number; delay?: number };

const reduceFn =
	<F extends URIS2>(mo: Instance<F>) =>
	<E, Args extends unknown[]>(acc: Kind2<F, E, VOK<F, Args>>, curr: Kind2<F, E, unknown>) => {
		const merge =
			<A>(result: A) =>
			(values: VOK<F, Args>): VOK<F, Args> =>
				[...values, result] as VOK<F, Args>;
		return pipe(acc, mo.apply(pipe(curr, mo.map(merge)))) as Kind2<F, E, VOK<F, Args>>;
	};

/**
 * Ejecuta un array de mónadas Kind2 con control de concurrencia y delay opcional.
 * Procesa las mónadas en lotes del tamaño especificado en la configuración.
 * TypeScript infiere automáticamente el tipo de error:
 * - Si todos tienen el mismo tipo E → resultado tiene tipo E
 * - Si tienen diferentes tipos → resultado tiene tipo E1 | E2 | E3 | ...
 *
 * @example
 * ```typescript
 * import * as TE from './task-either'
 * import { concurrency2 } from './utils'
 *
 * const tasks = [
 *   TE.right<string, number>(1),
 *   TE.right<string, number>(2),
 *   TE.right<string, number>(3),
 *   TE.right<string, number>(4)
 * ]
 *
 * // Ejecuta 2 tareas a la vez con 1 segundo de delay entre lotes
 * const result = concurrency2(TE)({ concurrency: 2, delay: 1000 })(tasks)
 * // TaskEither<string, [number, number, number, number]>
 * ```
 */
export const concurrency2 =
	<F extends URIS2>(mo: Instance<F>) =>
	(config?: Config) =>
	<const Args extends unknown[]>(
		args: Args,
		..._validation: Args extends EnsureKinds2<F, Args> ? [] : [invalid: never]
	): Kind2<F, UnionE<F, Args>, VOK<F, Args>> => {
		type E = UnionE<F, Args>;

		if (L.isEmpty(args)) return mo.of<E, VOK<F, Args>>([] as unknown as VOK<F, Args>);

		let acc = mo.of<E, VOK<F, Args>>([] as unknown as VOK<F, Args>);
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
					pipe(portion as unknown as Kind2<F, E, unknown>[], L.reduce(mo.of(values), reduceFn(mo))),
				),
			);
		}

		return acc;
	};
