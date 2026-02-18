/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect } from "vitest";
import * as M from "../lib/maybe.ts";
import { compose } from "../lib/compose.ts";

const toUpper = (s: string) => s.toUpperCase();
const toLower = (s: string) => s.toLowerCase();
const toFullName = (name: string) => (lastName: string) => `${name} ${lastName}`;
const countLetters = (s: string) => s.length;

describe("Maybe", () => {
  it("should transform and count letters correctly", () => {
    const name = M.just("Adriel");

    const op = compose(
      M.getOrElse(0),
      M.map(countLetters),
      M.map(toUpper),
      M.map(toLower),
      M.map(toUpper),
      M.chain((name: string) => M.just(toFullName(name)("Avila")))
    );

    const result = op(name);
    expect(result).toBe(12);
  });

  it("should return default value for nothing", () => {
    const name = M.nothing<string>();

    const op = compose(
      M.getOrElse(0),
      M.map(countLetters),
      M.map(toUpper),
      M.map(toLower),
      M.map(toUpper),
      M.chain((name: string) => M.just(toFullName(name)("Avila")))
    );

    const result = op(name);
    expect(result).toBe(0);
  });

  it("should handle just value correctly", () => {
    const name = M.just("John");

    const op = compose(
      M.getOrElse(0),
      M.map(countLetters),
      M.map(toUpper),
      M.map(toLower),
      M.map(toUpper),
      M.chain((name: string) => M.just(toFullName(name)("Doe")))
    );

    const result = op(name);
    expect(result).toBe(8);
  });

  it("should handle nested maybe values", () => {
    const name = M.just(M.just("Nested"));

    const op = compose(
      M.getOrElse(0),
      M.map(countLetters),
      M.map(toUpper),
      M.map(toLower),
      M.map(toUpper),
      M.chain((name: string) => M.just(toFullName(name)("Value")))
    );

    const result = op(M.join(name));
    expect(result).toBe(12);
  });
});
