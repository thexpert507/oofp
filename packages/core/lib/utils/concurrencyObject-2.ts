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
import type { EnsureKind2Record, Kind2Parts } from "./hkt-inference";
import type { Simplify } from "./simplify";

// Tipo de la instancia de la mónada
type Instance<F extends URIS2> = Monad2<F> & Applicative2<F> & Delayable2<F>;

// Extrae la unión de todos los tipos de error del objeto
type UnionE<F extends URIS2, Args extends Record<string, unknown>> = Kind2Parts<
	F,
	Args[keyof Args]
>[0];

// Mapea cada propiedad del objeto extrayendo el tipo de valor A
type InferA<F extends URIS2, Args extends Record<string, unknown>> = {
	[K in keyof Args]: Kind2Parts<F, Args[K]>[1];
};

// Resultado con el tipo completamente expandido
type Result<F extends URIS2, E, Args extends Record<string, unknown>> = Kind2<
	F,
	E,
	Simplify<InferA<F, Args>>
>;

type Config = { concurrency?: number; delay?: number };

const reduceFn =
	<F extends URIS2>(mo: Instance<F>) =>
	<E, Args extends Record<string, unknown>>(
		acc: Kind2<F, E, Simplify<InferA<F, Args>>>,
		[key, curr]: [string, Kind2<F, E, unknown>],
	) => {
		type Values = Simplify<InferA<F, Args>>;
		const merge =
			(result: unknown) =>
			(values: Values): Values =>
				({ ...values, [key]: result }) as Values;
		return pipe(acc, mo.apply(pipe(curr, mo.map(merge)))) as Kind2<F, E, Values>;
	};

/**
 * Ejecuta un objeto de mónadas Kind2 con control de concurrencia y delay opcional.
 * Procesa las mónadas en lotes del tamaño especificado en la configuración.
 * TypeScript infiere automáticamente el tipo de error:
 * - Si todos tienen el mismo tipo E → resultado tiene tipo E
 * - Si tienen diferentes tipos → resultado tiene tipo E1 | E2 | E3 | ...
 *
 * @example
 * ```typescript
 * import * as TE from './task-either'
 * import { concurrencyObject2 } from './utils'
 *
 * const tasks = {
 *   user: TE.right<string, User>({ name: 'John', age: 30 }),
 *   posts: TE.right<string, Post[]>([{ id: 1, title: 'Hello' }]),
 *   settings: TE.right<string, Settings>({ theme: 'dark' })
 * }
 *
 * // Ejecuta 2 tareas a la vez con 1 segundo de delay entre lotes
 * const result = concurrencyObject2(TE)({ concurrency: 2, delay: 1000 })(tasks)
 * // TaskEither<string, { user: User; posts: Post[]; settings: Settings }>
 * ```
 */
export const concurrencyObject2 =
	<F extends URIS2>(mo: Instance<F>) =>
	(config?: Config) =>
	<Args extends Record<string, unknown>>(
		args: Args & EnsureKind2Record<F, NoInfer<Args>>,
	): Result<F, UnionE<F, Args>, Args> => {
		type E = UnionE<F, Args>;

		let acc = mo.of<E, Simplify<InferA<F, Args>>>({} as Simplify<InferA<F, Args>>);
		let entries = Object.entries(args);

		if (L.isEmpty(entries)) return acc as Result<F, E, Args>;

		const concurrencyNumber = config?.concurrency ?? entries.length;

		// Usar iteración en lugar de recursión para evitar fugas de memoria
		while (entries.length > 0) {
			const portion = entries.slice(0, concurrencyNumber);
			entries = entries.slice(concurrencyNumber);

			acc = pipe(
				acc,
				config?.delay ? mo.delay(config.delay) : id(),
				mo.chain((values) =>
					pipe(portion as [string, Kind2<F, E, unknown>][], L.reduce(mo.of(values), reduceFn(mo))),
				),
			);
		}

		return acc as Result<F, E, Args>;
	};
