/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

// deno-lint-ignore-file no-explicit-any
import { Fn } from "./function.ts";

export const evaluate = <A, B>(fn: Fn<A, B>, arg: A): B => fn(arg);

type Curried<F> = F extends (...args: infer P) => infer R
  ? P extends [infer A, ...infer Rest]
    ? (a: A) => Curried<(...args: Rest) => R>
    : R
  : never;

export const curry = <F extends (...args: any[]) => any>(fn: F): Curried<F> => {
  const curried = (...args: unknown[]): unknown => {
    if (args.length >= fn.length) return fn(...args);
    return (...next: unknown[]) => curried(...args, ...next);
  };
  return curried as Curried<F>;
};

type Uncurried<F> = F extends (a: infer A) => infer B
  ? B extends (...args: any[]) => infer R
    ? (a: A, ...args: Parameters<B>) => R
    : never
  : never;

export const uncurry = <F extends (a: any) => any>(fn: F): Uncurried<F> => {
  return ((...args: any[]) => {
    return args.reduce((acc, arg) => acc(arg), fn);
  }) as Uncurried<F>;
};
