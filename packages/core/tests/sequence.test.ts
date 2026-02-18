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
import * as M from "@/maybe";
import * as T from "@/task";
import * as E from "@/either";
import * as TE from "@/task-either";
import * as RTE from "@/reader-task-either";
import { sequenceT } from "@/utils";

describe("Sequence array", () => {
  it("should be able to sequence two maybes", () => {
    const result = sequenceT(M)([M.just(1), M.just("2")]);

    expect(M.toNullable(result)).toEqual([1, "2"]);
  });

  it("should be able to sequence two tasks", async () => {
    const result = sequenceT(T)([T.of(1), T.of("2")]);

    expect(await result()).toEqual([1, "2"]);
  });

  it("should be able to sequence two either", () => {
    const result = sequenceT(E)([E.right(1), E.right("2")]);

    expect(result).toEqual(E.right([1, "2"]));
  });

  it("should be able to sequence two either with different types", () => {
    const e1 = E.right<string, number>(1);
    const e2 = E.right<string, string>("2");
    const e3 = E.right<string, number>(3);
    const e4 = E.left<string, number>("El unico error");

    const arr: E.Either<string, number | string>[] = [e1, e2, e3, e4];

    const result = sequenceT(E)(arr);

    expect(result).toEqual(E.left("El unico error"));
  });

  it("should be able to sequence two task either", async () => {
    const result = sequenceT(TE)([TE.right(1), TE.right("2")]);

    expect(await result()).toEqual(E.right([1, "2"]));
  });

  it("should be able to sequence two task either with different types", async () => {
    const result = sequenceT(TE)([TE.right(1), TE.left("El unico error")]);

    expect(await result()).toEqual(E.left("El unico error"));
  });

  it("should be able to sequence three task either with different contexts", async () => {
    type C1 = { c1: number };
    type C2 = { c2: string };
    type C3 = { c3: boolean };

    const rte1 = RTE.of<C1, never, number>(1);
    const rte2 = RTE.of<C2, never, string>("2");
    const rte3 = RTE.of<C3, never, boolean>(true);
    const arr = [rte1, rte2, rte3];

    const result = sequenceT(RTE)(arr as any);
    const response = await RTE.run({ c1: 1, c2: "a", c3: true })(result)();
    expect(response).toEqual(E.right([1, "2", true]));
  });
});
