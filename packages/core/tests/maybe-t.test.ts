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
import { maybeT } from "@/maybe-t";
import { compose } from "@/compose.ts";
import * as P from "@/promise.ts";
import * as TE from "@/task-either.ts";
import * as M from "@/maybe.ts";
import { id } from "@/id.ts";
import { pipe } from "@/pipe.ts";

describe("MaybeT", () => {
  it("performance", async () => {
    const start = performance.now();
    const MT = maybeT(P);
    const result = await pipe(
      P.of(M.of(10)),
      MT.map((x) => x + 1),
      MT.map((x) => x * 2),
      MT.map((x) => `Result: ${x}`)
    );
    const end = performance.now();
    console.log("Performance:", end - start);
    console.log(result);
  });

  it("should lift a value into a MaybeT", async () => {
    const MT = maybeT(P);
    const value = "Hello, World!";
    const result = await MT.lift(Promise.resolve(value));
    expect(result).toEqual(M.of(value));
  });

  it("should map a function over a MaybeT", async () => {
    const MT = maybeT(P);
    const value = "Hello, World!";
    const toUpperCase = (value: string) => value.toUpperCase();
    const composed = compose(MT.map(toUpperCase), MT.lift, id<Promise<string>>());
    const result = await composed(Promise.resolve(value));
    expect(result).toEqual(M.of(value.toUpperCase()));
  });

  it("should chain functions over a MaybeT", async () => {
    const MT = maybeT(P);
    const value = "Hello, World!";
    const toUpperCase = (value: string) => Promise.resolve(M.of(value.toUpperCase()));
    const result = await MT.chain(toUpperCase)(MT.lift(Promise.resolve(value)));
    expect(result).toEqual(M.of(value.toUpperCase()));
  });

  it("should handle Nothing in chain", async () => {
    const MT = maybeT(P);
    const toUpperCase = (value: string) => Promise.resolve(M.of(value.toUpperCase()));
    const result = await MT.chain(toUpperCase)(Promise.resolve(M.nothing()));
    expect(result).toEqual(M.nothing());
  });

  it("should handle uris 2", async () => {
    const MTE = maybeT(TE);

    const value = "Hello, World!";
    pipe(
      TE.of(value),
      TE.map(M.of),
      MTE.map((x) => x.toUpperCase())
    );
  });
});
