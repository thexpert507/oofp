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
import * as R from "@/reader";
import { sequenceObjectT, sequenceObjectT2 } from "@/utils";
import { pipe } from "@/pipe";

describe("Sequence object", () => {
  it("should sequence object with Maybe", () => {
    const a = M.just(1);
    const b = M.just("hello");

    const result = sequenceObjectT(M)({ a, b });

    expect(M.toNullable(result)).toMatchObject({ a: 1, b: "hello" });
  });

  it("should sequence object with Task", async () => {
    const a = T.of(1);
    const b = T.of("hello");

    const result = sequenceObjectT(T)({ a, b });

    expect(await result()).toMatchObject({ a: 1, b: "hello" });
  });

  it("should sequence object with Either", () => {
    const a = E.right(1);
    const b = E.right("hello");

    const result = sequenceObjectT2(E)({ a, b });

    expect(result).toMatchObject(E.right({ a: 1, b: "hello" }));
  });

  it("should sequence object with TaskEither", async () => {
    const a = TE.right(1);
    const b = TE.right("hello");

    const result = sequenceObjectT2(TE)({ a, b });

    expect(await result()).toMatchObject(E.right({ a: 1, b: "hello" }));
  });

  it("should sequence object with reader", async () => {
    const a = R.of<string, number>(1);
    const b = R.of<string, string>("hello");

    const sequenceReader = sequenceObjectT2(R);
    const result = sequenceReader({ a, b });

    expect(result("env")).toMatchObject({ a: 1, b: "hello" });
  });

  it("should sequence object with reader maybe", async () => {
    const a = R.of<string, M.Maybe<number>>(M.just(1));
    const b = R.of<string, M.Maybe<string>>(M.just("hello"));

    const result = pipe(sequenceObjectT2(R)({ a, b }), R.map(sequenceObjectT(M)));

    expect(result("env")).toMatchObject(M.just({ a: 1, b: "hello" }));
  });

  it("should sequence object with reader task", async () => {
    const a = R.of<string, T.Task<number>>(T.of(1));
    const b = R.of<string, T.Task<string>>(T.of("hello"));

    const result = pipe(sequenceObjectT2(R)({ a, b }), R.map(sequenceObjectT(T)));

    expect(await result("env")()).toMatchObject({ a: 1, b: "hello" });
  });

  it("should sequence object with reader either", async () => {
    const a = R.of<string, E.Either<string, number>>(E.right(1));
    const b = R.of<string, E.Either<string, string>>(E.right("hello"));

    const result = pipe(sequenceObjectT2(R)({ a, b }), R.map(sequenceObjectT2(E)));

    expect(result("env")).toMatchObject(E.right({ a: 1, b: "hello" }));
  });

  it("should sequence object with reader task either", async () => {
    const a = R.of<string, TE.TaskEither<string, number>>(TE.right(1));
    const b = R.of<string, TE.TaskEither<string, string>>(TE.right("hello"));

    const result = pipe(sequenceObjectT2(R)({ a, b }), R.map(sequenceObjectT2(TE)));

    expect(await result("env")()).toMatchObject(E.right({ a: 1, b: "hello" }));
  });
});
