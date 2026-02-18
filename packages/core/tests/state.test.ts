/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, test, expect } from "vitest";
import * as S from "@/state";
import * as M from "@/maybe";
import { pipe } from "@/pipe";

describe("State", () => {
  test("of", () => {
    const state = S.of(1);
    const result = state(0);
    expect(result).toEqual([1, 0]);
  });

  test("map", () => {
    const state = S.map((n: number) => n + 1)(S.of(1));
    const result = state(0);
    expect(result).toEqual([2, 0]);
  });

  test("chain", () => {
    const state = S.chain((n: number) => S.of(n + 1))(S.of(1));
    const result = state(0);
    expect(result).toEqual([2, 0]);
  });

  test("apply", () => {
    const state = S.apply(S.of((n: number) => n + 1))(S.of(1));
    const result = state(0);
    expect(result).toEqual([2, 0]);
  });

  test("join", () => {
    const state = S.join(S.of(S.of(1)));
    const result = state(0);
    expect(result).toEqual([1, 0]);
  });

  test("Whith maybe", () => {
    type MyState = { count: number };

    // pipe(S.of(M.just(1)));
  });
});
