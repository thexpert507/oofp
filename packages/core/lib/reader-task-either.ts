/**
 * Copyright (C) 2025 thexpert507
 *
 * This file is part of @oofp/core.
 *
 * @oofp/core is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { Applicative3 } from "./applicative";
import { BiPointed3 } from "./bi-pointed";
import { Delayable3 } from "./delayable";
import { E as EInstance } from "./either";
import { Fn } from "./function";
import { Monad3 } from "./monad";
import { OrElse3 } from "./or-else";
import { pipe } from "./pipe";
import * as R from "./reader";
import { Task } from "./task";
import * as TE from "./task-either";
import { concurrency3, concurrencyObject3, concurrentSettled3 } from "./utils";
import { sequenceObjectT3 } from "./utils/sequence-object3";
import { sequenceT3 } from "./utils/sequence-t3";
import type { Simplify } from "./utils/simplify";

export const URI = "ReaderTaskEither";
export type URI = typeof URI;

export type ReaderTaskEither<R, E, A> = R.Reader<R, TE.TaskEither<E, A>>;

declare module "./URIS3" {
	interface URItoKind3<_R, _E, _A> {
		ReaderTaskEither: ReaderTaskEither<_R, _E, _A>;
	}
}

export const id = <R, E, A>(rte: ReaderTaskEither<R, E, A>) => rte;

export const of =
	<R, E, A>(a: A): ReaderTaskEither<R, E, A> =>
	() =>
		TE.of(a);

export const from =
	<R, E, A>(te: TE.TaskEither<E, A>): ReaderTaskEither<R, E, A> =>
	() =>
		te;

export const left =
	<R, E, A>(e: E): ReaderTaskEither<R, E, A> =>
	() =>
		TE.left(e);

export const right =
	<R, E, A>(a: A): ReaderTaskEither<R, E, A> =>
	() =>
		TE.of(a);

export const fromReader =
	<R, A>(r: R.Reader<R, A>): ReaderTaskEither<R, never, A> =>
	(ctx: R) =>
		TE.of(r(ctx));

export const ask =
	<R>(): ReaderTaskEither<R, never, R> =>
	(ctx: R) =>
		TE.of(ctx);

export const tap =
	<R, E, A>(fn: Fn<A, void>) =>
	(rte: ReaderTaskEither<R, E, A>): ReaderTaskEither<R, E, A> =>
	(ctx: R) =>
		pipe(rte(ctx), TE.tap(fn));

export const tapR =
	<R, A>(fn: Fn<R, Fn<A, void>>) =>
	<E>(rte: ReaderTaskEither<R, E, A>): ReaderTaskEither<R, E, A> => {
		return (ctx: R) => pipe(rte(ctx), TE.tap(fn(ctx)));
	};

export const tapLeft =
	<R, E, A>(fn: Fn<E, void>) =>
	(rte: ReaderTaskEither<R, E, A>): ReaderTaskEither<R, E, A> =>
	(ctx: R) =>
		pipe(rte(ctx), TE.tapLeft(fn));

export const tapRTE =
	<R2, E2, A>(fn: Fn<A, ReaderTaskEither<R2, E2, void>>) =>
	<R1, E1>(rte: ReaderTaskEither<R1, E1, A>): ReaderTaskEither<R1 & R2, E1 | E2, A> => {
		return (ctx: R1 & R2) =>
			pipe(
				rte(ctx),
				TE.tapTE((a) => fn(a)(ctx)),
			);
	};

export const tapLeftRTE =
	<R2, E1, E2, A>(fn: Fn<E1, ReaderTaskEither<R2, E2, void>>) =>
	<R1>(rte: ReaderTaskEither<R1, E1, A>): ReaderTaskEither<R1 & R2, E1 | E2, A> => {
		return (ctx: R1 & R2) =>
			pipe(
				rte(ctx),
				TE.tapLeftTE((e) => fn(e)(ctx)),
			);
	};

export const tapRTEAsync =
	<R2, E2, A>(fn: Fn<A, ReaderTaskEither<R2, E2, void>>) =>
	<R1, E1>(rte: ReaderTaskEither<R1, E1, A>): ReaderTaskEither<R1 & R2, E1, A> => {
		return (ctx: R1 & R2) =>
			pipe(
				rte(ctx),
				TE.tapTEAsync((a) => fn(a)(ctx)),
			);
	};

export const tapRTEDetached =
	<R2, E2, A>(fn: Fn<A, ReaderTaskEither<R2, E2, void>>, onError?: Fn<E2, void>) =>
	<R1, E1>(rte: ReaderTaskEither<R1, E1, A>): ReaderTaskEither<R1 & R2, E1, A> => {
		return (ctx: R1 & R2) =>
			pipe(
				rte(ctx),
				TE.tapTEDetached((a) => fn(a)(ctx), onError),
			);
	};

export const tapLeftRTEAsync =
	<R2, E1, E2, A>(fn: Fn<E1, ReaderTaskEither<R2, E2, void>>) =>
	<R1>(rte: ReaderTaskEither<R1, E1, A>): ReaderTaskEither<R1 & R2, E1, A> => {
		return (ctx: R1 & R2) =>
			pipe(
				rte(ctx),
				TE.tapLeftTEAsync((e) => fn(e)(ctx)),
			);
	};

export const tapLeftRTEDetached =
	<R2, E1, E2, A>(fn: Fn<E1, ReaderTaskEither<R2, E2, void>>, onError?: Fn<E2, void>) =>
	<R1>(rte: ReaderTaskEither<R1, E1, A>): ReaderTaskEither<R1 & R2, E1, A> => {
		return (ctx: R1 & R2) =>
			pipe(
				rte(ctx),
				TE.tapLeftTEDetached((e) => fn(e)(ctx), onError),
			);
	};

export const map =
	<A, B>(fn: Fn<A, B>) =>
	<R, E>(rte: ReaderTaskEither<R, E, A>): ReaderTaskEither<R, E, B> => {
		return (ctx: R) => pipe(rte(ctx), TE.map(fn));
	};

export const mapWhithContext =
	<R, A, B>(fn: Fn<R, Fn<A, B>>) =>
	<E>(rte: ReaderTaskEither<R, E, A>): ReaderTaskEither<R, E, B> => {
		return (ctx: R) => pipe(rte(ctx), TE.map(fn(ctx)));
	};

export const mapLeft =
	<E, E2>(fn: Fn<E, E2>) =>
	<R, A>(rte: ReaderTaskEither<R, E, A>): ReaderTaskEither<R, E2, A> => {
		return (ctx: R) => pipe(rte(ctx), TE.mapLeft(fn));
	};

export const join = <R, E, A>(
	rte: ReaderTaskEither<R, E, ReaderTaskEither<R, E, A>>,
): ReaderTaskEither<R, E, A> => {
	return (ctx: R) =>
		pipe(
			rte(ctx),
			TE.chain((rte) => rte(ctx)),
		);
};

export const chain =
	<R, E2, A, B>(fn: Fn<A, ReaderTaskEither<R, E2, B>>) =>
	<E1>(rte: ReaderTaskEither<R, E1, A>): ReaderTaskEither<R, E1 | E2, B> => {
		return (ctx: R) =>
			pipe(
				rte(ctx),
				TE.chainw((a) => fn(a)(ctx)),
			);
	};

export const chainLeft =
	<R, E1, E2, A>(fn: Fn<E1, ReaderTaskEither<R, E2, A>>) =>
	(rte: ReaderTaskEither<R, E1, A>): ReaderTaskEither<R, E1 | E2, A> => {
		return (ctx: R) =>
			pipe(
				rte(ctx),
				TE.chainLeftw((e) => fn(e)(ctx)),
			);
	};

export const orElse =
	<R, E, A, E2>(fn: Fn<E, ReaderTaskEither<R, E2, A>>) =>
	(rte: ReaderTaskEither<R, E, A>): ReaderTaskEither<R, E2, A> => {
		return (ctx: R) =>
			pipe(
				rte(ctx),
				TE.orElse((e) => fn(e)(ctx)),
			);
	};

export const chaint =
	<E1, A, B>(fn: Fn<A, TE.TaskEither<E1, B>>) =>
	<R, E2>(rte: ReaderTaskEither<R, E2, A>): ReaderTaskEither<R, E1 | E2, B> => {
		return (ctx: R) => pipe(rte(ctx), TE.chainw(fn));
	};

export const chainwc =
	<R2, E2, A, B>(fn: Fn<A, ReaderTaskEither<R2, E2, B>>) =>
	<R1, E1>(rte: ReaderTaskEither<R1, E1, A>): ReaderTaskEither<R1 & R2, E1 | E2, B> => {
		return (ctx: R1 & R2) =>
			pipe(
				rte(ctx),
				TE.chainw((a) => fn(a)(ctx)),
			);
	};

export const chainLeftwc =
	<R2, E1, E2, A>(fn: Fn<E1, ReaderTaskEither<R2, E2, A>>) =>
	<R1>(rte: ReaderTaskEither<R1, E1, A>): ReaderTaskEither<R1 & R2, E1 | E2, A> => {
		return (ctx: R1 & R2) =>
			pipe(
				rte(ctx),
				TE.chainLeftw((e) => fn(e)(ctx)),
			);
	};

export const provide =
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		<R extends Record<any, any>, R2 extends Partial<R>>(r2: R2) =>
		<E, A>(ra: ReaderTaskEither<R, E, A>): ReaderTaskEither<Simplify<Omit<R, keyof R2>>, E, A> =>
		(r: Simplify<Omit<R, keyof R2>>) =>
			ra({ ...r2, ...r } as unknown as R);

export const provideTE =
	<E0, R2 extends Record<string, unknown>>(computeContext: TE.TaskEither<E0, R2>) =>
	<R extends Record<string, unknown>, E, A>(
		rte: ReaderTaskEither<R, E, A>,
	): ReaderTaskEither<Simplify<Omit<R, keyof R2>>, E | E0, A> =>
	(ctx: Simplify<Omit<R, keyof R2>>) =>
		pipe(
			computeContext,
			TE.chainw((r2) => rte({ ...ctx, ...r2 } as unknown as R)),
		);

export const provideRTE =
	<R0 extends Record<string, unknown>, E0, R2 extends Record<string, unknown>>(
		computeContext: ReaderTaskEither<R0, E0, R2>,
	) =>
	<R extends Record<string, unknown>, E, A>(
		rte: ReaderTaskEither<R, E, A>,
	): ReaderTaskEither<Simplify<Omit<R, keyof R2> & R0>, E | E0, A> =>
	(ctx: Simplify<Omit<R, keyof R2> & R0>) =>
		pipe(
			computeContext(ctx as unknown as R0),
			TE.chainw((r2) => rte({ ...ctx, ...r2 } as unknown as R)),
		);

export const provideF =
	<R0 extends Record<string, unknown>, E0, R2 extends Record<string, unknown>>(
		fn: (ctx: R0) => TE.TaskEither<E0, R2>,
	) =>
	<R extends Record<string, unknown>, E, A>(
		rte: ReaderTaskEither<R, E, A>,
	): ReaderTaskEither<Simplify<Omit<R, keyof R2> & R0>, E | E0, A> =>
	(ctx: Simplify<Omit<R, keyof R2> & R0>) =>
		pipe(
			fn(ctx as unknown as R0),
			TE.chainw((r2) => rte({ ...ctx, ...r2 } as unknown as R)),
		);

export const fold =
	<R, E, A, B>(onLeft: Fn<E, B>, onRight: Fn<A, B>) =>
	(rte: ReaderTaskEither<R, E, A>): R.Reader<R, Task<B>> => {
		return (ctx: R) => pipe(rte(ctx), TE.fold(onLeft, onRight));
	};

export const iif =
	<R, R2, E, E2, A, B>(
		condition: boolean,
		rteb1: Fn<A, ReaderTaskEither<R2, E2, B>>,
		rteb2: Fn<A, ReaderTaskEither<R2, E2, B>>,
	) =>
	(rte: ReaderTaskEither<R, E, A>): ReaderTaskEither<R & R2, E | E2, B> => {
		return (ctx: R & R2) =>
			pipe(
				rte(ctx as R),
				TE.iif(
					condition,
					(a) => rteb1(a)(ctx),
					(a) => rteb2(a)(ctx),
				),
			);
	};

export const run =
	<R>(r: R) =>
	<E, A>(rte: ReaderTaskEither<R, E, A>): TE.TaskEither<E, A> =>
		rte(r);

export const apply =
	<R2, E, A, B>(rtefn: ReaderTaskEither<R2, E, Fn<A, B>>) =>
	<R1>(rte: ReaderTaskEither<R1, E, A>): ReaderTaskEither<R1 & R2, E, B> => {
		return (ctx: R1 & R2) => pipe(rte(ctx), TE.apply(rtefn(ctx)));
	};

export const delay =
	(ms: number) =>
	<R, E, A>(rte: ReaderTaskEither<R, E, A>): ReaderTaskEither<R, E, A> => {
		return (ctx: R) => pipe(rte(ctx), TE.delay(ms));
	};

interface RTEF
	extends Monad3<URI>,
		Applicative3<URI>,
		Delayable3<URI>,
		OrElse3<URI>,
		BiPointed3<URI> {}

export const RTE: RTEF = { URI, of, map, join, chain, apply, delay, orElse, left, right };

export const sequence = sequenceT3(RTE);
export const sequenceObject = sequenceObjectT3(RTE);
export const concurrency = concurrency3(RTE);
export const concurrencyObject = concurrencyObject3(RTE);
export const concurrentSettled = concurrentSettled3(RTE)(EInstance);
