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
