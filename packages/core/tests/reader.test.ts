/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect } from "vitest";
import * as R from "@/reader";
import { pipe } from "@/pipe";
import { compose } from "@/compose";

describe("Reader", () => {
  it("should work", () => {
    type Env = number;

    const add =
      (a: number): R.Reader<Env, number> =>
      (r: Env) =>
        a + r;
    const mul =
      (a: number): R.Reader<Env, number> =>
      (r: Env) =>
        a * r;

    const composed = (r: Env) => pipe(add(1), R.chain(mul), R.call(r));

    expect(composed(2)).toEqual(6);
  });

  it("should work with lmap", () => {
    type Env = number;

    const add =
      (a: number): R.Reader<Env, number> =>
      (r: Env) =>
        a + r;
    const mul =
      (a: number): R.Reader<Env, number> =>
      (r: Env) =>
        a * r;

    const composed = (r: Env) =>
      pipe(
        add(1),
        R.lmap((r: number) => r + 1),
        R.chain(mul),
        R.call(r)
      );

    expect(composed(2)).toEqual(8);
  });

  it("should work with dimap", () => {
    type Env = number;

    const add =
      (a: number): R.Reader<Env, number> =>
      (r: number) =>
        a + r;

    const mul =
      (a: number): R.Reader<Env, number> =>
      (r: Env) =>
        a * r;

    const composed = compose(
      R.dimap(
        (r: string) => Number(r) + 1,
        (r: number) => r - 1
      ),
      R.chain(mul),
      add
    );

    const result = composed(2);

    expect(result("2")).toEqual(14);
  });

  it("should work with chainw", () => {
    type Env = { n: number };
    type Env2 = { c: string };

    const add =
      (a: number): R.Reader<Env, number> =>
      (r: Env) =>
        a + r.n;

    const mul =
      (a: number): R.Reader<Env2, number> =>
      (r: Env2) =>
        a * Number(r.c);

    const composed = compose(R.chainw(mul), add);

    const result = pipe(composed(2), R.provide({ c: "1" }));

    expect(result({ n: 2 })).toEqual(4);
  });
});
