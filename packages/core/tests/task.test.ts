/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
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
