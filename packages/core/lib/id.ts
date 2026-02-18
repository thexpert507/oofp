/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

export type Identity<A> = (a: A) => A;

export const id =
  <A>(): Identity<A> =>
  (x: A): A =>
    x;
