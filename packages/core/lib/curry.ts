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
