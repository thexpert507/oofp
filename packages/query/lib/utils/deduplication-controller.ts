import * as TE from "@oofp/core/task-either";
import * as E from "@oofp/core/either";
import type { TelemetryCollector } from "@/core/cache-events";

/**
 * Controlador de deduplicación de tareas
 * Gestiona la deduplicación de TaskEither en progreso, permitiendo que múltiples
 * invocaciones con la misma key compartan la ejecución mientras esté pendiente.
 * Registra eventos de deduplicación en el sistema de telemetría.
 */
export class DeduplicationController<Err = Error> {
	private pending = new Map<string, Promise<E.Either<Err, unknown>>>();
	private waiters = new Map<string, number>();

	constructor(private telemetry: TelemetryCollector) {}

	/**
	 * Deduplica la ejecución de una TaskEither basándose en una key
	 * Si ya existe una ejecución pendiente con la misma key, retorna esa promise.
	 * Si no existe, ejecuta la taskFn y almacena la promise hasta que finalice.
	 *
	 * @param key - Identificador único para la tarea
	 * @param taskFn - Función que retorna la TaskEither a ejecutar
	 * @returns TaskEither que será compartida entre múltiples invocaciones
	 */
	deduplicate<Data>(key: string, taskFn: () => TE.TaskEither<Err, Data>): TE.TaskEither<Err, Data> {
		// Retorna un TaskEither lazy que maneja la deduplicación
		return () => {
			const existing = this.pending.get(key);
			if (existing) {
				// Incrementar contador de waiters
				const currentWaiters = this.waiters.get(key) || 0;
				const newWaiters = currentWaiters + 1;
				this.waiters.set(key, newWaiters);

				// Registrar evento de deduplicación en telemetría
				this.telemetry.record({ type: "deduplicate", key, waiters: newWaiters });

				return existing as Promise<E.Either<Err, Data>>;
			}

			// Primera ejecución, inicializar waiters
			this.waiters.set(key, 0);

			// Ejecutar la task y guardar la promise
			const promise = taskFn()();
			this.pending.set(key, promise);

			// Limpiar del mapa cuando termine (éxito o error)
			promise.finally(() => {
				this.pending.delete(key);
				this.waiters.delete(key);
			});

			return promise;
		};
	}
}
