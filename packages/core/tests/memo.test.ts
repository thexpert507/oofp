/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect } from "vitest";
import { randomInt } from "node:crypto";
import { memo } from "@/memo.ts";

const factorial = (n: number): number => {
  if (n === 0) return 1;
  return n * factorial(n - 1);
};

describe("Memo", () => {
  it("should memoize factorial function", () => {
    const facMemo = memo(factorial);

    console.time("Memo: factorial");
    expect(facMemo(10)).toBe(3628800);
    console.timeEnd("Memo: factorial");

    console.time("Memo: factorial");
    expect(facMemo(10)).toBe(3628800);
    console.timeEnd("Memo: factorial");
  });

  it("should memoize random function", () => {
    const random = () => randomInt(100);
    const mrandom = memo(random);

    console.time("Memo: random");
    expect(mrandom(undefined)).toBe(mrandom(undefined));
    console.timeEnd("Memo: random");
  });

  it("should handle different arguments", () => {
    const add = (a: number, b: number) => a + b;
    const memoAdd = memo((args: [number, number]) => add(args[0], args[1]));

    expect(memoAdd([1, 2])).toBe(3);
    expect(memoAdd([1, 2])).toBe(3);
    expect(memoAdd([2, 3])).toBe(5);
  });

  it("should handle non-primitive arguments", () => {
    const stringify = (obj: object) => JSON.stringify(obj);
    const memoStringify = memo(stringify);

    const obj = { a: 1, b: 2 };
    expect(memoStringify(obj)).toBe(JSON.stringify(obj));
    expect(memoStringify(obj)).toBe(JSON.stringify(obj));
  });
});
