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

import * as T from "../lib/task";
import { describe, it, expect } from "vitest";

describe("Task", () => {
  it("should run a task", async () => {
    const task = T.of(1);
    const result = await T.run(task);
    expect(result).toBe(1);
  });

  it("should tap a task", async () => {
    const task = T.of(1);
    const tap = T.tap((x) => console.log(x));
    const result = await T.run(tap(task));
    expect(result).toBe(1);
  });

  it("should map a task", async () => {
    const task = T.of(1);
    const map = T.map((x: number) => x + 1);
    const result = await T.run(map(task));
    expect(result).toBe(2);
  });

  it("should join a task", async () => {
    const task = T.of(T.of(1));
    const join = T.join;
    const result = await T.run(join(task));
    expect(result).toBe(1);
  });

  it("should chain a task", async () => {
    const task = T.of(1);
    const chain = T.chain((x: number) => T.of(x + 1));
    const result = await T.run(chain(task));
    expect(result).toBe(2);
  });

  it("should taskified a function", async () => {
    const add = (a: number, b: number) => Promise.resolve(a + b);
    const taskAdd = T.taskify(add);
    const result = await T.run(taskAdd(1, 2));
    expect(result).toBe(3);
  });
});
