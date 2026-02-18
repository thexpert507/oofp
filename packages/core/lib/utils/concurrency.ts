/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Applicative } from "@/applicative";
import { Monad } from "@/monad";
import { Kind, URIS } from "@/URIS";
import * as L from "@/list";
import { pipe } from "@/pipe";
import { Delayable } from "@/delayable";
import { id } from "@/id";

// Tipo de la instancia de la mónada
type Instance<F extends URIS> = Monad<F> & Applicative<F> & Delayable<F>;

// Tipo para los valores que contiene cada mónada, como un array de `Kind<F, A>`
type VOK<F extends URIS, Args> = {
	[K in keyof Args]: Args[K] extends Kind<F, infer A> ? A : never;
};

// Non-empty array type para mayor seguridad de tipos
type ArgsType<F extends URIS> = [Kind<F, unknown>, ...Kind<F, unknown>[]] | Kind<F, unknown>[];

type Config = { concurrency?: number; delay?: number };

const reduceFn =
	<F extends URIS>(mo: Instance<F>) =>
	<Args extends ArgsType<F>>(acc: Kind<F, VOK<F, Args>>, curr: Kind<F, unknown>) => {
		const merge =
			<A>(result: A) =>
			(values: VOK<F, Args>): VOK<F, Args> =>
				[...values, result] as VOK<F, Args>;
		return pipe(acc, mo.apply(pipe(curr, mo.map(merge)))) as Kind<F, VOK<F, Args>>;
	};

/**
 * Ejecuta un array de mónadas con control de concurrencia y delay opcional.
 * Procesa las mónadas en lotes del tamaño especificado en la configuración.
 *
 * @example
 * ```typescript
 * import * as T from './task'
 * import { concurrencyT } from './utils'
 *
 * const tasks = [T.of(1), T.of(2), T.of(3), T.of(4)]
 *
 * // Ejecuta 2 tareas a la vez con 1 segundo de delay entre lotes
 * const result = concurrencyT(T)({ concurrency: 2, delay: 1000 })(tasks)
 * // Task<[1, 2, 3, 4]>
 * ```
 */
export const concurrencyT =
	<F extends URIS>(mo: Instance<F>) =>
	(config?: Config) =>
	<Args extends ArgsType<F>>(args: Args): Kind<F, VOK<F, Args>> => {
		if (L.isEmpty(args)) return mo.of([] as unknown as VOK<F, Args>);

		let acc = mo.of([] as unknown as VOK<F, Args>);
		let remaining = args;
		const concurrencyNumber = config?.concurrency ?? args.length;

		// Usar iteración en lugar de recursión para evitar fugas de memoria
		while (remaining.length > 0) {
			const portion = remaining.slice(0, concurrencyNumber) as Args;
			remaining = remaining.slice(concurrencyNumber) as Args;

			acc = pipe(
				acc,
				config?.delay ? mo.delay(config.delay) : id(),
				mo.chain((values) => pipe(portion, L.reduce(mo.of(values), reduceFn(mo)))),
			);
		}

		return acc;
	};
