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

import { Fn } from "./function.ts";

export const map =
	(fn: Fn<string, string>) =>
	(str: string): string =>
		str.split("").map(fn).join("");

export const tap =
	(fn: Fn<string, void>) =>
	(str: string): string => {
		fn(str);
		return str;
	};

export const charAt =
	(index: number) =>
	(str: string): string =>
		str.charAt(index);

export const charCodeAt =
	(index: number) =>
	(str: string): number =>
		str.charCodeAt(index);

export const slice =
	(start: number, end?: number) =>
	(str: string): string =>
		str.slice(start, end);

export const substring =
	(start: number, end?: number) =>
	(str: string): string =>
		str.substring(start, end);

export const substr =
	(start: number, length?: number) =>
	(str: string): string =>
		str.substr(start, length);

export const toLowerCase = (str: string): string => str.toLowerCase();

export const toUpperCase = (str: string): string => str.toUpperCase();

export const trim = (str: string): string => str.trim();

export const trimStart = (str: string): string => str.trimStart();

export const trimEnd = (str: string): string => str.trimEnd();

export const split =
	(separator: string | RegExp, limit?: number) =>
	(str: string): string[] =>
		str.split(separator, limit);

export const replace =
	(searchValue: string | RegExp, replaceValue: string) =>
	(str: string): string =>
		str.replace(searchValue, replaceValue);

export const replaceAll =
	(searchValue: string | RegExp, replaceValue: string) =>
	(str: string): string => {
		return typeof searchValue === "string"
			? str.split(searchValue).join(replaceValue)
			: str.replace(new RegExp(searchValue, "g"), replaceValue);
	};

export const match =
	(regexp: RegExp) =>
	(str: string): RegExpMatchArray | null =>
		str.match(regexp);

export const matchAll =
	(regexp: RegExp) =>
	(str: string): IterableIterator<RegExpMatchArray> =>
		str.matchAll(regexp);

export const search =
	(regexp: RegExp) =>
	(str: string): number =>
		str.search(regexp);

export const indexOf =
	(searchValue: string, fromIndex?: number) =>
	(str: string): number =>
		str.indexOf(searchValue, fromIndex);

export const lastIndexOf =
	(searchValue: string, fromIndex?: number) =>
	(str: string): number =>
		str.lastIndexOf(searchValue, fromIndex);

export const includes =
	(searchString: string, position?: number) =>
	(str: string): boolean =>
		str.includes(searchString, position);

export const startsWith =
	(searchString: string, position?: number) =>
	(str: string): boolean =>
		str.startsWith(searchString, position);

export const endsWith =
	(searchString: string, length?: number) =>
	(str: string): boolean =>
		str.endsWith(searchString, length);

export const concat =
	(...strings: string[]) =>
	(str: string): string =>
		str.concat(...strings);

export const repeat =
	(count: number) =>
	(str: string): string =>
		str.repeat(count);

export const padStart =
	(targetLength: number, padString?: string) =>
	(str: string): string =>
		str.padStart(targetLength, padString);

export const padEnd =
	(targetLength: number, padString?: string) =>
	(str: string): string =>
		str.padEnd(targetLength, padString);

export const length = (str: string): number => str.length;

export const isEmpty = (str: string): boolean => str.length === 0;

export const isBlank = (str: string): boolean => str.trim().length === 0;

export const reverse = (str: string): string => str.split("").reverse().join("");

export const capitalize = (str: string): string =>
	str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const uncapitalize = (str: string): string => str.charAt(0).toLowerCase() + str.slice(1);

export const camelCase = (str: string): string =>
	str
		.replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
		.replace(/^[A-Z]/, (char) => char.toLowerCase());

export const pascalCase = (str: string): string =>
	str
		.replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
		.replace(/^[a-z]/, (char) => char.toUpperCase());

export const kebabCase = (str: string): string =>
	str
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/[\s_]+/g, "-")
		.toLowerCase();

export const snakeCase = (str: string): string =>
	str
		.replace(/([a-z])([A-Z])/g, "$1_$2")
		.replace(/[\s-]+/g, "_")
		.toLowerCase();

export const words = (str: string): string[] => str.match(/\b\w+\b/g) || [];

export const truncate =
	(maxLength: number, suffix: string = "...") =>
	(str: string): string =>
		str.length <= maxLength ? str : str.slice(0, maxLength - suffix.length) + suffix;

export const ellipsis =
	(maxLength: number) =>
	(str: string): string =>
		truncate(maxLength, "...")(str);

export const lines = (str: string): string[] => str.split(/\r\n|\r|\n/);

export const unlines = (lines: string[]): string => lines.join("\n");

export const removeAccents = (str: string): string => str.normalize("NFD").replace(/\p{M}/gu, "");

export const slugify = (str: string): string =>
	removeAccents(str)
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");

export const escapeHtml = (str: string): string =>
	str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

export const unescapeHtml = (str: string): string =>
	str
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

export const count =
	(substring: string) =>
	(str: string): number => {
		if (substring.length === 0) return 0;
		let count = 0;
		let index = 0;
		while ((index = str.indexOf(substring, index)) !== -1) {
			count++;
			index += substring.length;
		}
		return count;
	};

export const insert =
	(index: number, substring: string) =>
	(str: string): string =>
		str.slice(0, index) + substring + str.slice(index);

export const remove =
	(start: number, length: number) =>
	(str: string): string =>
		str.slice(0, start) + str.slice(start + length);

export const takeLeft =
	(n: number) =>
	(str: string): string =>
		str.slice(0, n);

export const takeRight =
	(n: number) =>
	(str: string): string =>
		str.slice(-n);

export const dropLeft =
	(n: number) =>
	(str: string): string =>
		str.slice(n);

export const dropRight =
	(n: number) =>
	(str: string): string =>
		str.slice(0, -n);

export const filter =
	(predicate: Fn<string, boolean>) =>
	(str: string): string =>
		str.split("").filter(predicate).join("");

export const find =
	(predicate: Fn<string, boolean>) =>
	(str: string): string | undefined =>
		str.split("").find(predicate);

export const every =
	(predicate: Fn<string, boolean>) =>
	(str: string): boolean =>
		str.split("").every(predicate);

export const some =
	(predicate: Fn<string, boolean>) =>
	(str: string): boolean =>
		str.split("").some(predicate);

export const isAlpha = (str: string): boolean => /^[a-zA-Z]+$/.test(str);

export const isNumeric = (str: string): boolean => /^[0-9]+$/.test(str);

export const isAlphaNumeric = (str: string): boolean => /^[a-zA-Z0-9]+$/.test(str);

export const isEmail = (str: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

export const isUrl = (str: string): boolean => {
	try {
		new URL(str);
		return true;
	} catch {
		return false;
	}
};

export const equals =
	(str1: string) =>
	(str2: string): boolean =>
		str1 === str2;

export const equalsIgnoreCase =
	(str1: string) =>
	(str2: string): boolean =>
		str1.toLowerCase() === str2.toLowerCase();
