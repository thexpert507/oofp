/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Fn } from "@/function";

export const tap =
  <A>(fn: Fn<A, void>) =>
  (a: A): A => {
    fn(a);
    return a;
  };

export const map =
  <A, B>(fn: Fn<A, B>) =>
  (a: A): B =>
    fn(a);
