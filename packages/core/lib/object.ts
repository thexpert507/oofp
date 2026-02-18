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

import { Fn } from "./function";
import type { Simplify } from "./utils/simplify";

/**
 * Nota sobre el uso de bucles for:
 *
 * Aunque este es un módulo funcional, utilizamos bucles for en lugar de métodos como
 * .reduce(), .map(), etc. por las siguientes razones de optimización:
 *
 * 1. **Rendimiento**: Los bucles for son significativamente más rápidos que los métodos
 *    de array, especialmente para objetos grandes, ya que evitan la creación de arrays
 *    intermedios y múltiples invocaciones de funciones.
 *
 * 2. **Inmutabilidad preservada**: A pesar de usar bucles imperativos internamente,
 *    todas las funciones mantienen la inmutabilidad - nunca mutan los objetos de entrada.
 *
 * 3. **Early returns**: Los bucles permiten optimizaciones como early returns en
 *    funciones como `every`, `some`, y `find`, terminando tan pronto como se encuentra
 *    el resultado deseado.
 *
 * 4. **Menor overhead**: Evitamos el overhead de Object.entries() seguido de métodos
 *    de array, usando directamente nuestras funciones entries() tipadas.
 *
 * Esta es una optimización interna que no afecta la API funcional externa.
 */

/**
 * Tipo para objetos genéricos (cualquier objeto con claves string).
 */
export type AnyObj<K extends string = string, V = unknown> = Record<K, V>;

export const mapValues =
	<T extends AnyObj, R>(fn: (value: T[keyof T]) => R) =>
	(obj: T): Record<keyof T, R> => {
		const result = {} as Record<keyof T, R>;
		for (const [key, value] of entries(obj as AnyObj<string, T[keyof T]>)) {
			result[key as keyof T] = fn(value);
		}
		return result;
	};

export const mapKeyValues =
	<T extends AnyObj, R>(fn: (key: keyof T & string) => (value: T[keyof T]) => R) =>
	(obj: T): Record<keyof T, R> => {
		const result = {} as Record<keyof T, R>;
		for (const [key, value] of entries(obj as AnyObj<string, T[keyof T]>)) {
			result[key as keyof T] = fn(key as keyof T & string)(value);
		}
		return result;
	};

export const mapProperty =
	<K extends AnyObj, P extends keyof K, B>(property: P, fn: Fn<K[P], B>) =>
	(obj: K): Simplify<Omit<K, P> & Record<P, B>> => {
		return { ...obj, [property]: fn(obj[property]) } as unknown as Simplify<
			Omit<K, P> & Record<P, B>
		>;
	};

export const mapPropertywc =
	<K extends AnyObj, P extends keyof K, B>(property: P, fn: Fn<{ value: K[P]; ctx: K }, B>) =>
	(obj: K): Simplify<Omit<K, P> & Record<P, B>> => {
		return { ...obj, [property]: fn({ value: obj[property], ctx: obj }) } as unknown as Simplify<
			Omit<K, P> & Record<P, B>
		>;
	};

export const values = <K extends string, V>(obj: AnyObj<K, V>): V[] => Object.values(obj);

export const keys = <K extends string, V>(obj: AnyObj<K, V>): K[] => Object.keys(obj) as K[];

export const entries = <K extends string, V>(obj: AnyObj<K, V>): [K, V][] =>
	Object.entries(obj) as [K, V][];

export const fromEntries = <K extends string, V>(entries: [K, V][]): AnyObj<K, V> =>
	Object.fromEntries(entries) as AnyObj<K, V>;

// Filtrar propiedades de un objeto
export const filter =
	<K extends string, V>(predicate: (value: V, key: K) => boolean) =>
	(obj: AnyObj<K, V>): Partial<AnyObj<K, V>> => {
		const result = {} as Partial<AnyObj<K, V>>;
		for (const [key, value] of entries(obj)) {
			// Early continue si el predicado es falso
			if (!predicate(value, key)) continue;
			result[key] = value;
		}
		return result;
	};

// Recoger solo las propiedades especificadas
export const pick =
	<K extends string, V, P extends K>(keys: readonly P[]) =>
	(obj: AnyObj<K, V>): Pick<AnyObj<K, V>, P> => {
		const result = {} as Pick<AnyObj<K, V>, P>;
		for (const key of keys) {
			// Early continue si la propiedad no existe
			if (!(key in obj)) continue;
			result[key] = obj[key];
		}
		return result;
	};

export const omit =
	<K extends string, V, P extends K>(keys: readonly P[]) =>
	(obj: AnyObj<K, V>): Omit<AnyObj<K, V>, P> => {
		const keysSet = new Set(keys);
		const result = {} as Omit<AnyObj<K, V>, P>;
		for (const [key, value] of entries(obj)) {
			if (keysSet.has(key as P)) continue;
			(result as Record<string, V>)[key] = value;
		}
		return result;
	};

export const size = <K extends string, V>(obj: AnyObj<K, V>): number => keys(obj).length;

export const isEmpty = <K extends string, V>(obj: AnyObj<K, V>): boolean => {
	// Early return para objetos vacíos - más eficiente que calcular size completo
	for (const _ in obj) {
		return false;
	}
	return true;
};

export const has =
	<T extends object, K extends keyof T>(key: K) =>
	(obj: T): boolean =>
		key in obj;

// Obtener un valor (cuando la clave está garantizada por tipos)
export const get =
	<T, K extends keyof T>(key: K) =>
	(obj: T): T[K] =>
		obj[key];

// Obtener un valor con valor por defecto (para claves opcionales)
export const getOr =
	<T, K extends keyof T>(key: K, defaultValue: T[K]) =>
	(obj: T): T[K] =>
		obj[key] ?? defaultValue;

// Fusionar dos objetos
export const merge =
	<K extends string, V>(obj2: AnyObj<K, V>) =>
	(obj1: AnyObj<K, V>): AnyObj<K, V> => ({ ...obj1, ...obj2 });

// Fusión profunda de objetos
export const deepMerge =
	<K extends string, V>(obj2: AnyObj<K, V>) =>
	(obj1: AnyObj<K, V>): AnyObj<K, V> => {
		const result = { ...obj1 };
		for (const [key, value] of Object.entries(obj2)) {
			if (
				typeof value === "object" &&
				value !== null &&
				!Array.isArray(value) &&
				typeof result[key as K] === "object" &&
				result[key as K] !== null &&
				!Array.isArray(result[key as K])
			) {
				result[key as K] = deepMerge(value as AnyObj<string, unknown>)(
					result[key as K] as AnyObj<string, unknown>,
				) as V;
			} else {
				result[key as K] = value as V;
			}
		}
		return result;
	};

// Mapear solo las claves
export const mapKeys =
	<K extends string, V, R extends string>(fn: (key: K) => R) =>
	(obj: AnyObj<K, V>): AnyObj<R, V> => {
		const result = {} as AnyObj<R, V>;
		for (const [key, value] of entries(obj)) {
			result[fn(key)] = value;
		}
		return result;
	};

// Reducir un objeto a un valor
export const reduce =
	<K extends string, V, R>(fn: (acc: R, value: V, key: K) => R, initial: R) =>
	(obj: AnyObj<K, V>): R => {
		let result = initial;
		for (const [key, value] of entries(obj)) {
			result = fn(result, value, key);
		}
		return result;
	};

// Invertir un objeto (intercambiar claves y valores)
export const invert = <K extends string, V extends string>(obj: AnyObj<K, V>): AnyObj<V, K> => {
	const result = {} as AnyObj<V, K>;
	for (const [key, value] of entries(obj)) {
		result[value] = key;
	}
	return result;
};

// Agrupar por una función de agrupación
export const groupBy =
	<V, G extends string>(fn: (value: V) => G) =>
	<K extends string>(obj: AnyObj<K, V>): AnyObj<G, V[]> => {
		const result = {} as AnyObj<G, V[]>;
		for (const [, value] of entries(obj)) {
			const group = fn(value);
			// Early assignment si el grupo no existe
			if (!result[group]) result[group] = [];
			result[group].push(value);
		}
		return result;
	};

// Verificar si todos los valores cumplen una condición
export const every =
	<K extends string, V>(predicate: (value: V, key: K) => boolean) =>
	(obj: AnyObj<K, V>): boolean => {
		for (const [key, value] of entries(obj)) {
			if (!predicate(value, key)) return false;
		}
		return true;
	};

// Verificar si algún valor cumple una condición
export const some =
	<K extends string, V>(predicate: (value: V, key: K) => boolean) =>
	(obj: AnyObj<K, V>): boolean => {
		for (const [key, value] of entries(obj)) {
			if (predicate(value, key)) return true;
		}
		return false;
	};

// Encontrar la primera entrada que cumple una condición
export const find =
	<K extends string, V>(predicate: (value: V, key: K) => boolean) =>
	(obj: AnyObj<K, V>): [K, V] | undefined => {
		for (const [key, value] of entries(obj)) {
			if (predicate(value, key)) return [key, value];
		}
		return undefined;
	};

// Crear un objeto a partir de un array usando una función de mapeo
export const fromArray =
	<T, K extends string, V>(keyFn: (item: T) => K, valueFn: (item: T) => V) =>
	(array: readonly T[]): AnyObj<K, V> => {
		const result = {} as AnyObj<K, V>;
		for (const item of array) {
			result[keyFn(item)] = valueFn(item);
		}
		return result;
	};
