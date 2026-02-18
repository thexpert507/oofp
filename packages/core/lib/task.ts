/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Fn } from "./function";
import { URIS } from "./URIS";
import * as P from "./promise";
import { Monad } from "./monad";
import { Applicative } from "./applicative";
import { Delayable } from "./delayable";
import { sequenceT, sequenceObjectT, concurrencyT, concurrencyObjectT } from "./utils";

export const URI = "Task";
export type URI = typeof URI;

export type Task<T> = () => Promise<T>;

declare module "./URIS" {
	interface URItoKind<A> {
		Task: Task<A>;
	}
}

export const taskify =
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		<Args extends any[], R>(fn: (...args: Args) => Promise<R>) =>
		(...args: Args): Task<R> =>
		() =>
			fn(...args);

export const run = <A>(task: Task<A>): Promise<A> => task();

export const of =
	<A>(a: A): Task<A> =>
	() =>
		P.of(a);

export const tap =
	<A>(f: Fn<A, void>) =>
	(ta: Task<A>): Task<A> =>
	() =>
		P.tap(f)(ta());

export const tapRejected =
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		<E = any>(f: Fn<E, void>) =>
		<A>(ta: Task<A>): Task<A> =>
		() =>
			ta().catch((e) => {
				f(e);
				return Promise.reject(e);
			});

export const map =
	<A, B>(f: Fn<A, B>) =>
	(ta: Task<A>): Task<B> =>
	() =>
		P.map(f)(ta());

export const join =
	<A>(tta: Task<Task<A>>): Task<A> =>
	() =>
		tta().then((ta) => ta());

export const chain =
	<A, B>(f: Fn<A, Task<B>>) =>
	(ta: Task<A>): Task<B> =>
	() =>
		ta().then((a) => run(f(a)));

export const tchain =
	<A>(f: Fn<A, Task<void>>) =>
	(ta: Task<A>): Task<A> =>
	() =>
		ta().then((a) => run(f(a)).then(() => a));

export const apply =
	<A, B>(tf: Task<Fn<A, B>>) =>
	(ta: Task<A>): Task<B> =>
	async () => {
		return Promise.all([tf(), ta()]).then(([f, a]) => f(a));
	};

export const rejected =
	<A>(e: Error | string): Task<A> =>
	() =>
		Promise.reject(e);

export const delay =
	(ms: number) =>
	<A>(ta: Task<A>): Task<A> =>
	() =>
		ta().then((a) => new Promise((resolve) => setTimeout(() => resolve(a), ms)));

export const fold =
	<A, R>(g: Fn<unknown, R>, f: Fn<A, R>) =>
	(ta: Task<A>): Promise<R> =>
		ta().then(f).catch(g);

interface MTask<F extends URIS> extends Monad<F>, Applicative<F>, Delayable<F> {}

export const T: MTask<URI> = { URI, of, map, join, chain, apply, delay };

export const sequence = sequenceT(T);
export const sequenceObject = sequenceObjectT(T);
export const concurrency = concurrencyT(T);
export const concurrencyObject = concurrencyObjectT(T);
