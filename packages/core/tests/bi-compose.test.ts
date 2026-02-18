/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
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
