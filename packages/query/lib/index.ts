/**
 * @oofp/query
 * Librería de query builders funcionales para Backend
 */

export const version = "0.1.0-beta.1";

// Exportar accesor
export { QueryClientAccesor } from "./accesor";

// Exportar módulos principales
export * from "./client";
export * from "./core";

// Exportar utilidades
export { LRUCache } from "./utils/lru-cache";
export { serialize, extractTags, type SerializeOptions } from "./utils/serialize";
