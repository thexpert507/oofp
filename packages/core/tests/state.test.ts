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

import { describe, test, expect } from "vitest";
import * as S from "@/state";
import * as M from "@/maybe";
import { pipe } from "@/pipe";

describe("State", () => {
  test("of", () => {
    const state = S.of(1);
    const result = state(0);
    expect(result).toEqual([1, 0]);
  });

  test("map", () => {
    const state = S.map((n: number) => n + 1)(S.of(1));
    const result = state(0);
    expect(result).toEqual([2, 0]);
  });

  test("chain", () => {
    const state = S.chain((n: number) => S.of(n + 1))(S.of(1));
    const result = state(0);
    expect(result).toEqual([2, 0]);
  });

  test("apply", () => {
    const state = S.apply(S.of((n: number) => n + 1))(S.of(1));
    const result = state(0);
    expect(result).toEqual([2, 0]);
  });

  test("join", () => {
    const state = S.join(S.of(S.of(1)));
    const result = state(0);
    expect(result).toEqual([1, 0]);
  });

  test("Whith maybe", () => {
    type MyState = { count: number };

    // pipe(S.of(M.just(1)));
  });
});
