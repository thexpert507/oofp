/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect } from "vitest";
import { id } from "../lib/id";

describe("ID function", () => {
  it("should return the same number", () => {
    const value = 1;
    expect(id()(value)).toBe(value);
  });

  it("should return the same string", () => {
    const value = "test";
    expect(id()(value)).toBe(value);
  });

  it("should return the same object", () => {
    const value = { key: "value" };
    expect(id()(value)).toBe(value);
  });

  it("should return the same array", () => {
    const value = [1, 2, 3];
    expect(id()(value)).toBe(value);
  });

  it("should return the same boolean", () => {
    const value = true;
    expect(id()(value)).toBe(value);
  });
});
