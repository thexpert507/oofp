/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Fn } from "./function";
import { Monad } from "./monad";
import { Applicative } from "./applicative";
import { sequenceT, sequenceObjectT } from "./utils";

export const URI = "IO";
export type URI = typeof URI;

/**
 * IO representa una computación que puede tener efectos secundarios.
 * Es una función que no toma argumentos y retorna un valor.
 * La computación no se ejecuta hasta que se llama explícitamente con `run`.
 */
export type IO<A> = () => A;

declare module "./URIS" {
	interface URItoKind<A> {
		IO: IO<A>;
	}
}

/**
 * Ejecuta la computación IO y retorna el resultado.
 */
export const run = <A>(io: IO<A>): A => io();

/**
 * Crea una computación IO que retorna el valor dado.
 */
export const of =
	<A>(a: A): IO<A> =>
	() =>
		a;

/**
 * Crea una computación IO desde una función thunk.
 */
export const from = <A>(thunk: () => A): IO<A> => thunk;

/**
 * Transforma el valor dentro de la computación IO.
 */
export const map =
	<A, B>(f: Fn<A, B>) =>
	(io: IO<A>): IO<B> =>
	() =>
		f(io());

/**
 * Aplana una computación IO anidada.
 */
export const join =
	<A>(iio: IO<IO<A>>): IO<A> =>
	() =>
		iio()();

/**
 * Encadena computaciones IO secuencialmente.
 */
export const chain =
	<A, B>(f: Fn<A, IO<B>>) =>
	(io: IO<A>): IO<B> =>
	() =>
		f(io())();

/**
 * Aplica una función IO a un valor IO.
 */
export const apply =
	<A, B>(iof: IO<Fn<A, B>>) =>
	(ioa: IO<A>): IO<B> =>
	() =>
		iof()(ioa());

/**
 * Ejecuta una computación IO para efectos secundarios, pero retorna el valor original.
 */
export const tap =
	<A>(f: Fn<A, void>) =>
	(io: IO<A>): IO<A> =>
	() => {
		const a = io();
		f(a);
		return a;
	};

/**
 * Convierte una función síncrona en una computación IO.
 */
export const fromSync =
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		<Args extends any[], R>(fn: (...args: Args) => R) =>
		(...args: Args): IO<R> =>
		() =>
			fn(...args);

/**
 * Crea una computación IO que siempre falla con el error dado.
 */
export const throwError =
	<A>(error: Error): IO<A> =>
	() => {
		throw error;
	};

/**
 * Maneja errores en una computación IO.
 */
export const catchError =
	<A>(onError: Fn<Error, A>) =>
	(io: IO<A>): IO<A> =>
	() => {
		try {
			return io();
		} catch (error) {
			return onError(error as Error);
		}
	};

/**
 * Ejecuta dos computaciones IO en secuencia, retornando el resultado de la segunda.
 */
export const andThen =
	<B>(iob: IO<B>) =>
	<A>(ioa: IO<A>): IO<B> =>
	() => {
		ioa();
		return iob();
	};

/**
 * Ejecuta dos computaciones IO en secuencia, retornando el resultado de la primera.
 */
export const andThenDiscard =
	<B>(iob: IO<B>) =>
	<A>(ioa: IO<A>): IO<A> =>
	() => {
		const a = ioa();
		iob();
		return a;
	};

interface IOF extends Monad<URI>, Applicative<URI> {}

export const IO: IOF = { URI, of, map, join, chain, apply };

export const sequence = sequenceT(IO);
export const sequenceObject = sequenceObjectT(IO);
