/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind2, URIS2 } from "@/URIS2";
import { Kind3, URIS3 } from "@/URIS3";
import { Applicative3 } from "@/applicative";
import { BiPointed2 } from "@/bi-pointed";
import { Delayable3 } from "@/delayable";
import { Monad3 } from "@/monad";
import { OrElse3 } from "@/or-else";
import { pipe } from "@/pipe";
import { concurrency3 } from "./concurrency-3";
import type { EnsureKinds3, UnionToIntersection } from "./hkt-inference";

type Instance<F extends URIS3> = Monad3<F> & Applicative3<F> & Delayable3<F> & OrElse3<F>;

type Contexts<F extends URIS3, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind3<F, infer R, infer _E, infer _A> ? R : never;
};

type UnionR<F extends URIS3, Args extends unknown[]> = UnionToIntersection<
	Contexts<F, Args>[number]
>;

type SettledResults<F extends URIS3, G extends URIS2, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind3<F, infer _R, infer E, infer A> ? Kind2<G, E, A> : never;
};

type Config = { concurrency?: number; delay?: number };

export const concurrentSettled3 =
	<F extends URIS3>(mo: Instance<F>) =>
	<G extends URIS2>(collect: BiPointed2<G>) =>
	(config?: Config) =>
	<const Args extends unknown[]>(
		args: Args,
		..._validation: Args extends EnsureKinds3<F, Args> ? [] : [invalid: never]
	): Kind3<F, UnionR<F, Args>, never, SettledResults<F, G, Args>> => {
		const makeSafe = <R, E, A>(monad: Kind3<F, R, E, A>): Kind3<F, R, never, Kind2<G, E, A>> =>
			pipe(
				monad,
				mo.map((result): Kind2<G, E, A> => collect.right<E, A>(result)),
				mo.orElse((err): Kind3<F, R, never, Kind2<G, E, A>> => mo.of(collect.left<E, A>(err))),
			);

		type SafeArg = Kind3<F, UnionR<F, Args>, never, Kind2<G, unknown, unknown>>;
		const safeMonads = args.map((arg) =>
			makeSafe(arg as unknown as Kind3<F, UnionR<F, Args>, unknown, unknown>),
		) as Array<SafeArg>;
		const runConcurrent = concurrency3(mo)(config) as (values: SafeArg[]) => unknown;
		return runConcurrent(safeMonads) as Kind3<
			F,
			UnionR<F, Args>,
			never,
			SettledResults<F, G, Args>
		>;
	};
