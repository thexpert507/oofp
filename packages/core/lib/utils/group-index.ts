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

export const groupBy =
  <T>(fn: (item: T) => string | number) =>
  (iterable: Iterable<T>) => {
    return [...iterable].reduce<Record<string, T[]>>((groups, curr) => {
      const key = fn(curr);
      const group = groups[key] ?? [];
      group.push(curr);
      return { ...groups, [key]: group };
    }, {});
  };

export const indexBy =
  <T>(fn: (item: T) => string | number) =>
  (iterable: Iterable<T>) => {
    return [...iterable].reduce<Record<string, T>>((groups, curr) => {
      const key = fn(curr);
      return { ...groups, [key]: curr };
    }, {});
  };
