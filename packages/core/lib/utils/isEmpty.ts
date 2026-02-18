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

export const isEmpty = <T>(value: T): boolean => {
  if (typeof value === "string") return value.trim().length === 0;
  if (value instanceof Date) return isNaN(value.getTime());
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof Object) return Object.keys(value).length === 0;
  return false;
};
