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
