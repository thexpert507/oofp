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
