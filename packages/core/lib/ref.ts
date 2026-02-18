/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Fn } from "./function";
import { IO } from "./io";

export const URI = "Ref";
export type URI = typeof URI;

/**
 * Lens para acceder y modificar partes específicas de un valor.
 * Un lens es una abstracción para acceder a partes anidadas de estructuras de datos inmutables.
 */
export interface Lens<S, A> {
	/** Obtiene el valor A desde S */
	get: Fn<S, A>;
	/** Establece el valor A en S, retornando un nuevo S */
	set: Fn<A, Fn<S, S>>;
}

/**
 * Ref representa una referencia mutable que encapsula operaciones de lectura y escritura
 * como computaciones IO. Permite manejar estado mutable de manera funcional.
 */
export interface Ref<A> {
	/** Lee el valor actual de la referencia */
	read: IO<A>;
	/** Escribe un nuevo valor en la referencia */
	write: (value: A) => IO<void>;
	/** Modifica el valor actual usando una función y retorna el nuevo valor */
	modify: (f: Fn<A, A>) => IO<A>;
	/** Actualiza el valor actual usando una función y retorna un valor derivado */
	update: <B>(f: Fn<A, [A, B]>) => IO<B>;
	/** Lee una parte específica del valor usando un lens */
	view: <B>(lens: Lens<A, B>) => IO<B>;
	/** Crea una nueva Ref que opera sobre una parte del valor usando un lens */
	focus: <B>(lens: Lens<A, B>) => Ref<B>;
}

/**
 * Implementación interna de Ref usando una referencia mutable.
 */
class RefImpl<A> implements Ref<A> {
	constructor(private _value: A) {}

	get read(): IO<A> {
		return () => this._value;
	}

	write = (value: A): IO<void> => {
		return () => {
			this._value = value;
		};
	};

	modify = (f: Fn<A, A>): IO<A> => {
		return () => {
			this._value = f(this._value);
			return this._value;
		};
	};

	update = <B>(f: Fn<A, [A, B]>): IO<B> => {
		return () => {
			const [newValue, result] = f(this._value);
			this._value = newValue;
			return result;
		};
	};

	view = <B>(lens: Lens<A, B>): IO<B> => {
		return () => lens.get(this._value);
	};

	focus = <B>(lens: Lens<A, B>): Ref<B> => {
		return new FocusedRef(this, lens);
	};
}

/**
 * Implementación de una Ref enfocada en una parte específica usando un lens.
 */
class FocusedRef<S, A> implements Ref<A> {
	constructor(
		private parent: Ref<S>,
		private lens: Lens<S, A>,
	) {}

	get read(): IO<A> {
		return () => {
			const parentValue = this.parent.read();
			return this.lens.get(parentValue);
		};
	}

	write = (value: A): IO<void> => {
		return () => {
			const parentValue = this.parent.read();
			const newParentValue = this.lens.set(value)(parentValue);
			this.parent.write(newParentValue)();
		};
	};

	modify = (f: Fn<A, A>): IO<A> => {
		return () => {
			const currentValue = this.read();
			const newValue = f(currentValue);
			this.write(newValue)();
			return newValue;
		};
	};

	update = <B>(f: Fn<A, [A, B]>): IO<B> => {
		return () => {
			const currentValue = this.read();
			const [newValue, result] = f(currentValue);
			this.write(newValue)();
			return result;
		};
	};

	view = <B>(lens: Lens<A, B>): IO<B> => {
		return () => {
			const currentValue = this.read();
			return lens.get(currentValue);
		};
	};

	focus = <B>(lens: Lens<A, B>): Ref<B> => {
		return new FocusedRef(this, lens);
	};
}

/**
 * Crea una nueva Ref con el valor inicial dado.
 */
export const newRef = <A>(initialValue: A): IO<Ref<A>> => {
	return () => new RefImpl(initialValue);
};

/**
 * Ejecuta una computación con una Ref temporal, garantizando que se libere después.
 */
export const withRef =
	<A, B>(initialValue: A) =>
	(computation: Fn<Ref<A>, IO<B>>): IO<B> => {
		return () => {
			const ref = new RefImpl(initialValue);
			return computation(ref)();
		};
	};

// Utilidades para crear lenses comunes

/**
 * Crea un lens para una propiedad específica de un objeto.
 */
export const prop = <S, K extends keyof S>(key: K): Lens<S, S[K]> => ({
	get: (s: S) => s[key],
	set: (value: S[K]) => (s: S) => ({ ...s, [key]: value }),
});

/**
 * Crea un lens para un índice específico de un array.
 */
export const index = <A>(i: number): Lens<A[], A | undefined> => ({
	get: (arr: A[]) => arr[i],
	set: (value: A | undefined) => (arr: A[]) => {
		if (value === undefined) {
			return arr.filter((_, idx) => idx !== i);
		}
		const newArr = [...arr];
		newArr[i] = value;
		return newArr;
	},
});

/**
 * Compone dos lenses para crear un lens más profundo.
 */
export const compose = <A, B, C>(lensAB: Lens<A, B>, lensBC: Lens<B, C>): Lens<A, C> => ({
	get: (a: A) => lensBC.get(lensAB.get(a)),
	set: (c: C) => (a: A) => {
		const b = lensAB.get(a);
		const newB = lensBC.set(c)(b);
		return lensAB.set(newB)(a);
	},
});

/**
 * Lens identidad que no transforma el valor.
 */
export const identity = <A>(): Lens<A, A> => ({
	get: (a: A) => a,
	set: (value: A) => () => value,
});

// Operaciones de conveniencia

/**
 * Lee el valor de una Ref y ejecuta la operación IO.
 */
export const readRef = <A>(ref: Ref<A>): A => ref.read();

/**
 * Escribe un valor en una Ref y ejecuta la operación IO.
 */
export const writeRef = <A>(ref: Ref<A>, value: A): void => ref.write(value)();

/**
 * Modifica una Ref con una función y ejecuta la operación IO.
 */
export const modifyRef = <A>(ref: Ref<A>, f: Fn<A, A>): A => ref.modify(f)();

/**
 * Intercambia los valores de dos Refs.
 */
export const swapRefs = <A>(ref1: Ref<A>, ref2: Ref<A>): IO<void> => {
	return () => {
		const value1 = ref1.read();
		const value2 = ref2.read();
		ref1.write(value2)();
		ref2.write(value1)();
	};
};
