/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect } from "vitest";
import { flow } from "../lib/flow.ts";
import * as M from "../lib/maybe.ts";
import * as E from "../lib/either.ts";
import * as L from "../lib/list.ts";

describe("Flow", () => {
  it("equals types", () => {
    const f1 = (x: number) => x + 1;
    const f2 = (x: number) => x * 2;
    const composed = flow(f1, f2);
    expect(composed(1)).toBe(4); // 1 + 1 = 2, 2 * 2 = 4
  });

  it("different types", () => {
    const f1 = (x: string) => x.length;
    const f2 = (x: number) => x + 1;
    const composed = flow(f1, f2);
    expect(composed("1")).toBe(2); // "1".length = 1, 1 + 1 = 2
  });

  it("3 functions", () => {
    const composed = flow(
      E.map((x: M.Maybe<number>) => M.getOrElse(0)(x)),
      E.map((x: number) => x * 2),
      E.getOrElse(() => 0)
    );
    const result = composed(E.right(M.just(10)));
    expect(result).toBe(20); // 10 * 2 = 20
  });

  it("Functors", () => {
    const square = (x: number) => x * x;
    const mis = M.just([1, 2, 3]);
    const map = flow(L.map, M.map);
    const mis2 = map(square);
    expect(M.getOrElse<number[]>([])(mis2(mis))).toEqual([1, 4, 9]);
  });

  it("Flow: nested functions", () => {
    const f1 = (x: number) => x + 1;
    const f2 = (x: number) => x * 2;
    const f3 = (x: number) => x - 3;
    const composed = flow(f1, f2, f3);
    expect(composed(5)).toBe(9); // (5 + 1) * 2 - 3 = 9
  });

  it("Flow: with Maybe", () => {
    const f1 = (x: number) => x + 1;
    const f2 = (x: number) => x * 2;
    const composed = flow(M.map(f1), M.map(f2));
    const result = composed(M.just(2));
    expect(M.getOrElse(0)(result)).toBe(6); // (2 + 1) * 2 = 6
  });

  it("Flow: with Either", () => {
    const f1 = (x: number) => x + 1;
    const f2 = (x: number) => x * 2;
    const composed = flow(E.map(f1), E.map(f2));
    const result = composed(E.right(2));
    expect(E.getOrElse(() => 0)(result)).toBe(6); // (2 + 1) * 2 = 6
  });
});
