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

import { Applicative2 } from "./applicative";
import { Fn } from "./function";
import { Monad2 } from "./monad";
import { pipe } from "./pipe";
import { ProFunctor } from "./profunctor";

export const URI = "Reader";
export type URI = typeof URI;

export type Reader<R, A> = (r: R) => A;

declare module "./URIS2" {
	interface URItoKind2<E, A> {
		Reader: Reader<E, A>;
	}
}

export const of =
	<R, A>(value: A): Reader<R, A> =>
	() =>
		value;

export const from = <R, A>(fn: Fn<R, A>): Reader<R, A> => fn;

export const ask =
	<R>(): Reader<R, R> =>
	(r: R) =>
		r;

export const rmap =
	<A, B>(fn: Fn<A, B>) =>
	<R>(as: Reader<R, A>): Reader<R, B> =>
	(r: R) =>
		pipe(as(r), fn);

export const map = rmap;

export const lmap =
	<R, R2>(fn: Fn<R2, R>) =>
	<A>(ra: Reader<R, A>): Reader<R2, A> =>
	(r: R2) =>
		ra(fn(r));

export const dimap =
	<R, A, R2, A2>(fn: Fn<R2, R>, gn: Fn<A, A2>) =>
	(ra: Reader<R, A>): Reader<R2, A2> =>
	(r: R2) =>
		pipe(ra(fn(r)), gn);

export const call =
	<R>(r: R) =>
	<A>(ra: Reader<R, A>): A =>
		ra(r);

export const join =
	<R, A>(rra: Reader<R, Reader<R, A>>): Reader<R, A> =>
	(r: R) =>
		rra(r)(r);

export const chain =
	<R, A, B>(fn: Fn<A, Reader<R, B>>) =>
	(ra: Reader<R, A>): Reader<R, B> =>
	(r: R) =>
		pipe(ra(r), fn, call(r));

export const chainw =
	<R2, A, B>(fn: Fn<A, Reader<R2, B>>) =>
	<R>(ra: Reader<R, A>): Reader<R & R2, B> =>
	(r: R & R2) =>
		pipe(ra(r), fn, call(r));

export const provide =
	<R extends Record<string | number | symbol, unknown>, R2 extends Partial<R>>(r2: R2) =>
	<A>(ra: Reader<R, A>): Reader<Omit<R, keyof R2>, A> =>
	(r: Omit<R, keyof R2>) =>
		ra({ ...r2, ...r } as unknown as R);

export const run =
	<R>(r: R) =>
	<A>(ra: Reader<R, A>): A =>
		ra(r);

export const apply =
	<R, A, B>(rfa: Reader<R, Fn<A, B>>) =>
	(ra: Reader<R, A>): Reader<R, B> =>
	(r: R) =>
		pipe(rfa(r), (fa) => pipe(ra(r), (a) => fa(a)));

interface RF extends Monad2<URI>, ProFunctor<URI>, Applicative2<URI> {}

export const R: RF = { URI, of, map, rmap, lmap, dimap, chain, join, apply };
