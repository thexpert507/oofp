/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect } from "vitest";
import { curry, uncurry } from "../lib/curry";

describe("Curry and Uncurry Functions", () => {
  it("should curry a function", () => {
    const add = (a: number, b: number) => a + b;
    const curried = curry(add);
    expect(curried(1)(2)).toBe(3);
  });

  it("should uncurry a function", () => {
    const add = (a: number) => (b: number) => a + b;
    const uncurried = uncurry(add);
    expect(uncurried(1, 2)).toBe(3);
  });

  it("should handle multiple arguments", () => {
    const multiply = (a: number, b: number, c: number) => a * b * c;
    const curried = curry(multiply);
    expect(curried(2)(3)(4)).toBe(24);
  });

  it.skip("should handle uncurrying of multiple arguments", () => {
    const multiply = (a: number) => (b: number) => (c: number) => a * b * c;
    const uncurried = uncurry(multiply);
    expect(uncurried(2, 3)).toBe(24);
  });

  it("should handle single argument functions", () => {
    const identity = (a: number) => a;
    const curried = curry(identity);
    expect(curried(5)).toBe(5);
  });
});
