/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

/**
 * Utilidad para "aplanar" y expandir tipos complejos, haciéndolos más legibles.
 * 
 * Convierte intersecciones complejas como `Omit<T, K> & Record<K, V>` en un tipo simple y expandido.
 * También fuerza la expansión de tipos mapeados y condicionales para mejorar la legibilidad
 * en tooltips de VS Code y mensajes de error de TypeScript.
 * 
 * @example
 * ```typescript
 * // Sin Simplify:
 * type Complex = Omit<{ a: number; b: string }, "a"> & Record<"a", boolean>
 * // Tipo mostrado: Omit<{ a: number; b: string }, "a"> & Record<"a", boolean>
 * 
 * // Con Simplify:
 * type Simple = Simplify<Omit<{ a: number; b: string }, "a"> & Record<"a", boolean>>
 * // Tipo mostrado: { a: boolean; b: string }
 * ```
 */
export type Simplify<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
