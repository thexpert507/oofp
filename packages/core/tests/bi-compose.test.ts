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
import * as E from "../lib/either.ts";
import * as P from "../lib/promise.ts";
import * as M from "../lib/maybe.ts";
import { bicompose } from "../lib/bi-compose.ts";
import { compose } from "../lib/compose.ts";
import { id } from "../lib/id.ts";

describe("bi-compose", () => {
  const BI = bicompose<E.URI, P.URI, M.URI>(E, P, M);

  const toUpper = (s: string) => s.toUpperCase();
  const length = (a: number[]) => `${a.length} items`;
  const double = (b: number) => b * 2;

  it("should handle left side composition", async () => {
    const composed = compose(
      BI.bimap(toUpper, double),
      BI.bimap(length, id()),
      id<E.Either<Promise<number[]>, M.Maybe<number>>>()
    );

    const result = composed(E.left(Promise.resolve([1])));
    console.log(result);
    expect(result.tag).toBe("Left");
    expect(result.value).toBeInstanceOf(Promise);
    const resolvedValue = await result.value;
    expect(resolvedValue).toBe("1 ITEMS");
  });

  it("should handle right side composition", () => {
    const composed = compose(
      BI.bimap(toUpper, double),
      BI.bimap(length, id()),
      id<E.Either<Promise<number[]>, M.Maybe<number>>>()
    );

    const result = composed(E.right(M.just(2)));

    expect(result.tag).toBe("Right");
    expect(result.value).toEqual(M.just(4));
  });

  it("should handle nested composition", async () => {
    const composed = compose(
      BI.bimap(toUpper, double),
      BI.bimap(length, id()),
      id<E.Either<Promise<number[]>, M.Maybe<number>>>()
    );

    const result = composed(E.left(Promise.resolve([1, 2, 3])));

    expect(result.tag).toBe("Left");
    expect(result.value).toBeInstanceOf(Promise);
    const resolvedValue = await result.value;
    expect(resolvedValue).toBe("3 ITEMS");
  });

  it("should handle empty maybe", () => {
    const composed = compose(
      BI.bimap(toUpper, double),
      BI.bimap(length, id()),
      id<E.Either<Promise<number[]>, M.Maybe<number>>>()
    );

    const result = composed(E.right(M.nothing()));

    expect(result.tag).toBe("Right");
    expect(result.value).toEqual(M.nothing());
  });
});
