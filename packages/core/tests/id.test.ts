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
