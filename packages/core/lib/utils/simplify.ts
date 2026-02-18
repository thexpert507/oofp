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
