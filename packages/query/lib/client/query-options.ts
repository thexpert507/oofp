import { QueryKey } from "@/core";
import * as TE from "@oofp/core/task-either";

/**
 * Opciones para ejecutar una query
 */
export interface QueryOptions<TData> {
	queryKey: QueryKey;
	queryFn: () => TE.TaskEither<Error, TData>;
	ttl?: number; // Time-to-live en ms
	retry?: number | false; // Número de reintentos (default: 3)
	retryDelay?: number; // Delay entre reintentos en ms (default: 1000)
	enabled?: boolean; // Si false, no ejecuta (default: true)
}
