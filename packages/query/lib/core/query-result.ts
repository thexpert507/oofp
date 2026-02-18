/**
 * Resultado de una query con metadata
 */
export interface QueryResult<TData> {
	data: TData;
	cached: boolean; // Si vino del cache o se fetcheó
	age: number; // Edad de los datos en ms
}
