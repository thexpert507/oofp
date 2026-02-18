/**
 * Opciones para una mutación
 */
import { QueryKey } from "@/core/query-key";
import * as TE from "@oofp/core/task-either";

export interface MutationOptions<TData, TVariables = void> {
	/**
	 * Función que ejecuta la mutación
	 */
	mutationFn: (variables: TVariables) => TE.TaskEither<Error, TData>;

	/**
	 * Función que determina qué query keys invalidar después de una mutación exitosa
	 */
	invalidates?: (variables: TVariables, result: TData) => QueryKey[];
}
