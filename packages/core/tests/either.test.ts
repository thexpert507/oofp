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
import { compose } from "../lib/compose";
import * as E from "../lib/either";

const divide = (x: number, y: number): E.Either<string, number> => {
  if (y === 0) return E.left("Division by zero");
  return E.right(x / y);
};

describe("Either", () => {
  it("should return 3.5 for valid division operations", () => {
    const op = compose(
      E.rmap((x: number) => x + 1),
      E.chain((x: number) => divide(x, 2)),
      E.chain((x: number) => divide(x, 2))
    );

    const result = op(E.right(10));
    expect(result.value).toBe(3.5);
  });

  it("should return 'Division by zero' for division by zero", () => {
    const op = compose(
      E.rmap((x: number) => x + 1),
      E.chain((x: number) => divide(x, 0)),
      E.chain((x: number) => divide(x, 2))
    );

    const result = op(E.right(10));
    expect(result.value).toBe("Division by zero");
  });

  it("should handle left value correctly", () => {
    const op = compose(
      E.rmap((x: number) => x + 1),
      E.chain((x: number) => divide(x, 2)),
      E.chain((x: number) => divide(x, 2))
    );

    const result = op(E.left("Initial error"));
    expect(result.value).toBe("Initial error");
  });

  it("should return 2.5 for valid division operations", () => {
    const op = compose(
      E.map((x: number) => x + 1),
      E.chain((x: number) => divide(x, 2))
    );

    const result = op(E.right(3));
    expect(result.value).toBe(2.5);
  });
});
