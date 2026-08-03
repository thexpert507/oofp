/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind2, URIS2 } from "@/URIS2";
import { Applicative2 } from "@/applicative";
import { BiPointed2 } from "@/bi-pointed";
import { Delayable2 } from "@/delayable";
import { Monad2 } from "@/monad";
import { OrElse2 } from "@/or-else";
import { pipe } from "@/pipe";
import { concurrency2 } from "./concurrency-2";
import type { EnsureKinds2 } from "./hkt-inference";

type Instance<F extends URIS2> = Monad2<F> & Applicative2<F> & Delayable2<F> & OrElse2<F>;

type SettledResults<F extends URIS2, G extends URIS2, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind2<F, infer E, infer A> ? Kind2<G, E, A> : never;
};

type Config = { concurrency?: number; delay?: number };

export const concurrentSettled2 =
	<F extends URIS2>(mo: Instance<F>) =>
	<G extends URIS2>(collect: BiPointed2<G>) =>
	(config?: Config) =>
	<const Args extends unknown[]>(
		args: Args,
		..._validation: Args extends EnsureKinds2<F, Args> ? [] : [invalid: never]
	): Kind2<F, never, SettledResults<F, G, Args>> => {
		const makeSafe = <E, A>(monad: Kind2<F, E, A>): Kind2<F, never, Kind2<G, E, A>> =>
			pipe(
				monad,
				mo.map((result): Kind2<G, E, A> => collect.right<E, A>(result)),
				mo.orElse((err): Kind2<F, never, Kind2<G, E, A>> => mo.of(collect.left<E, A>(err))),
			);

		type SafeArg = Kind2<F, never, Kind2<G, unknown, unknown>>;
		const safeMonads = args.map((arg) =>
			makeSafe(arg as unknown as Kind2<F, unknown, unknown>),
		) as Array<SafeArg>;
		const runConcurrent = concurrency2(mo)(config) as (values: SafeArg[]) => unknown;
		return runConcurrent(safeMonads) as Kind2<F, never, SettledResults<F, G, Args>>;
	};
