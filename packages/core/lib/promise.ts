/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Applicative } from "./applicative.ts";
import { Monad } from "./monad.ts";

export const URI = "Promise";
export type URI = typeof URI;

export const of = <A>(value: A): Promise<A> => Promise.resolve(value);

export const tap =
  <A>(f: (a: A) => void) =>
  (value: Promise<A>): Promise<A> =>
    value.then((value) => {
      f(value);
      return value;
    });

export const join = <A>(value: Promise<Promise<A>>): Promise<A> => value.then((value) => value);

export const map =
  <A, B>(f: (a: A) => B) =>
  (value: Promise<A>): Promise<B> =>
    value.then(f);

export const chain =
  <A, B>(f: (a: A) => Promise<B>) =>
  (value: Promise<A>): Promise<B> =>
    value.then(f);

export const apply =
  <A, B>(fab: Promise<(a: A) => B>) =>
  (fa: Promise<A>): Promise<B> =>
    fab.then((f) => fa.then(f));

export const isPromise = <A>(value: unknown): value is Promise<A> => value instanceof Promise;

export const reject = <A>(error: unknown): Promise<A> => Promise.reject(error);

export const resolve = <A>(value: A): Promise<A> => Promise.resolve(value);

interface PF extends Monad<URI>, Applicative<URI> {}

export const P: PF = { URI, map, join, of, chain, apply };
