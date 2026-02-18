/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect } from "vitest";
import { profunctor } from "../lib/profunctor.ts";

describe("Profunctor", () => {
  it("should log the original message", () => {
    const log = (msg: string) => msg;
    const logger = profunctor(log);
    expect(logger.call("Hello, World!")).toBe("Hello, World!");
  });

  it("should log the message in uppercase", () => {
    const log = (msg: string) => msg;
    const logger = profunctor(log);
    const upperLogger = logger.lmap((msg: string) => msg.toUpperCase());
    expect(upperLogger.call("Hello, World!")).toBe("HELLO, WORLD!");
  });

  it("should log the numbers as a comma-separated string", () => {
    const log = (msg: string) => msg;
    const logger = profunctor(log);
    const numberLogger = logger.lmap((numbers: number[]) => numbers.join(", "));
    expect(numberLogger.call([1, 2, 3])).toBe("1, 2, 3");
  });

  it("should prepend 'Double: ' to the message", () => {
    const log = (msg: string) => msg;
    const logger = profunctor(log);
    const doubleLogger = logger.rmap((msg: string) => `Double: ${msg}`);
    expect(doubleLogger.call("Hello, World!")).toBe("Double: Hello, World!");
  });

  it("should compose lmap and rmap correctly", () => {
    const log = (msg: string) => msg;
    const logger = profunctor(log);
    const composedLogger = logger
      .lmap((msg: string) => msg.toUpperCase())
      .rmap((msg: string) => `Composed: ${msg}`);
    expect(composedLogger.call("Hello, World!")).toBe("Composed: HELLO, WORLD!");
  });
});
