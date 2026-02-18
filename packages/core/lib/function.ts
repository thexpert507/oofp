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

export type Fn<A = unknown, B = unknown> = (a: A) => B;
export type Fn2<A = unknown, B = unknown, C = unknown> = (a: A) => (b: B) => C;
export type Fn3<A = unknown, B = unknown, C = unknown, D = unknown> = (
  a: A
) => (b: B) => (c: C) => D;

export type Predicate<T = unknown> = Fn<T, boolean>;
