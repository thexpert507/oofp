/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Monad } from "@/monad.ts";
import { Fn, Fn2 } from "./function";
import { Applicative } from "./applicative";
import { sequenceObjectT, sequenceT } from "./utils";

export const URI = "Maybe";
export type URI = typeof URI;

export type Maybe<T = never> = { kind: "Just"; value: T } | { kind: "Nothing" };

declare module "./URIS" {
  interface URItoKind<A> {
    Maybe: Maybe<A>;
  }
}

const Nothing: Maybe<unknown> = { kind: "Nothing" };

export const just = <T>(value: T): Maybe<T> => ({ kind: "Just", value });
export const nothing = <T>(): Maybe<T> => Nothing;

export const fromNullable = <T>(value: T | null | undefined): Maybe<T> =>
  value === null || value === undefined ? Nothing : just(value);

export const of = <T>(value: T | null | undefined): Maybe<T> => {
  return value === null || value === undefined ? Nothing : just(value);
};

export const isNothing = <T>(value: Maybe<T>): value is { kind: "Nothing" } =>
  value.kind === Nothing.kind;

export const isJust = <T>(value: Maybe<T>): value is { kind: "Just"; value: T } =>
  !isNothing(value);

export const identity = <T>(value: Maybe<T>): Maybe<T> => value;

export const iif =
  <T>(condition: Fn<T, boolean>) =>
  (value: Maybe<T>): Maybe<T> => {
    if (isNothing(value)) return value;
    return condition(value.value) ? value : Nothing;
  };

export const iifNot =
  <T>(condition: Fn<T, boolean>) =>
  (value: Maybe<T>): Maybe<T> => {
    if (isNothing(value)) return value;
    return !condition(value.value) ? value : Nothing;
  };

export const map =
  <T, U>(fn: (value: T) => U) =>
  (mo: Maybe<T>): Maybe<U> =>
    isNothing(mo) ? Nothing : just(fn(mo.value));

export const chain =
  <T, U>(fn: (value: T) => Maybe<U>) =>
  (mo: Maybe<T>): Maybe<U> =>
    isNothing(mo) ? Nothing : fn(mo.value);

export const join = <T>(mo: Maybe<Maybe<T>>): Maybe<T> => (isNothing(mo) ? Nothing : mo.value);

export const chainNothing =
  <T>(fn: () => Maybe<T>) =>
  (mo: Maybe<T>): Maybe<T> =>
    isNothing(mo) ? fn() : mo;

export const tap =
  <T>(fn: (value: T) => void) =>
  (mo: Maybe<T>): Maybe<T> => {
    if (isJust(mo)) fn(mo.value);
    return mo;
  };

export const tapNothing =
  (fn: () => void) =>
  <T>(value: Maybe<T>): Maybe<T> => {
    if (isNothing(value)) fn();
    return value;
  };

export const fold =
  <T, U>(onNothing: () => U, onJust: (value: T) => U) =>
  (mo: Maybe<T>): U =>
    isNothing(mo) ? onNothing() : onJust(mo.value);

export const getOrElse =
  <T>(defaultValue: T) =>
  (mo: Maybe<T>): T =>
    isNothing(mo) ? defaultValue : mo.value;

export const toNullable = <T>(mo: Maybe<T>): T | null => (isNothing(mo) ? null : mo.value);

export const toUndefined = <T>(mo: Maybe<T>): T | undefined =>
  isNothing(mo) ? undefined : mo.value;

export const apply =
  <T, U>(fn: Maybe<Fn<T, U>>) =>
  (mo: Maybe<T>): Maybe<U> =>
    isNothing(fn) || isNothing(mo) ? Nothing : just(fn.value(mo.value));

export const liftA2 =
  <T, U, V>(fn: Fn2<T, U, V>) =>
  (mo1: Maybe<T>) =>
  (mo2: Maybe<U>): Maybe<V> =>
    apply(map(fn)(mo1))(mo2);

interface MF extends Monad<URI>, Applicative<URI> {}

export const M: MF = { URI, map, chain, of, join, apply };

export const sequence = sequenceT(M);
export const sequenceObject = sequenceObjectT(M);
