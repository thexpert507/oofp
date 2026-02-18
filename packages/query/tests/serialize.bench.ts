import { bench, describe } from "vitest";
import { serialize } from "../lib/utils/serialize";

describe("serialize performance", () => {
	describe("primitivos", () => {
		bench("serializa strings", () => {
			serialize("hello world");
		});

		bench("serializa números", () => {
			serialize(42);
		});

		bench("serializa booleanos", () => {
			serialize(true);
		});

		bench("serializa null", () => {
			serialize(null);
		});
	});

	describe("fechas", () => {
		const date = new Date("2025-10-31T10:30:00.000Z");

		bench("serializa fechas", () => {
			serialize(date);
		});
	});

	describe("arrays", () => {
		const smallArray = [1, 2, 3, 4, 5];
		const mediumArray = Array.from({ length: 50 }, (_, i) => i);
		const largeArray = Array.from({ length: 500 }, (_, i) => i);
		const mixedArray = [1, "hello", true, null, { id: 1 }];

		bench("array pequeño (5 elementos)", () => {
			serialize(smallArray);
		});

		bench("array mediano (50 elementos)", () => {
			serialize(mediumArray);
		});

		bench("array grande (500 elementos)", () => {
			serialize(largeArray);
		});

		bench("array mixto", () => {
			serialize(mixedArray);
		});
	});

	describe("objetos simples", () => {
		const small = { id: 1, name: "John" };
		const medium = {
			id: 1,
			name: "John",
			email: "john@example.com",
			age: 30,
			active: true,
			role: "admin",
			created: "2025-01-01",
			updated: "2025-10-31",
		};
		const large = Object.fromEntries(
			Array.from({ length: 50 }, (_, i) => [`field${i}`, `value${i}`]),
		);

		bench("objeto pequeño (2 claves)", () => {
			serialize(small);
		});

		bench("objeto mediano (8 claves)", () => {
			serialize(medium);
		});

		bench("objeto grande (50 claves)", () => {
			serialize(large);
		});
	});

	describe("objetos desordenados (peor caso)", () => {
		// Objetos con claves en orden inverso (requiere más ordenamiento)
		const small = { z: 1, y: 2, x: 3, w: 4, v: 5 };
		const medium = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`key${19 - i}`, i]));
		const large = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`key${99 - i}`, i]));

		bench("objeto pequeño desordenado (5 claves)", () => {
			serialize(small);
		});

		bench("objeto mediano desordenado (20 claves)", () => {
			serialize(medium);
		});

		bench("objeto grande desordenado (100 claves)", () => {
			serialize(large);
		});
	});

	describe("estructuras anidadas", () => {
		const shallow = {
			user: { id: 1, name: "John" },
			settings: { theme: "dark", lang: "es" },
		};

		const deep = {
			level1: {
				level2: {
					level3: {
						level4: {
							level5: {
								value: "deep",
							},
						},
					},
				},
			},
		};

		const wide = {
			users: Array.from({ length: 20 }, (_, i) => ({
				id: i,
				name: `User${i}`,
				email: `user${i}@example.com`,
			})),
		};

		bench("objeto con 2 niveles de anidación", () => {
			serialize(shallow);
		});

		bench("objeto profundamente anidado (5 niveles)", () => {
			serialize(deep);
		});

		bench("objeto con array de 20 objetos", () => {
			serialize(wide);
		});
	});

	describe("casos de uso reales (cache queries)", () => {
		const simpleQuery = {
			endpoint: "/users",
			method: "GET",
		};

		const queryWithParams = {
			endpoint: "/users",
			method: "GET",
			params: {
				limit: 10,
				offset: 0,
				sort: "name",
			},
		};

		const complexQuery = {
			endpoint: "/api/v1/users/search",
			method: "POST",
			params: {
				limit: 20,
				offset: 0,
				sort: "created_at",
				order: "desc",
			},
			body: {
				filters: {
					age: { min: 18, max: 65 },
					roles: ["admin", "user", "moderator"],
					active: true,
					created: { after: "2024-01-01", before: "2025-12-31" },
				},
				includes: ["profile", "settings", "permissions"],
			},
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer token123",
			},
		};

		bench("query simple (2 campos)", () => {
			serialize(simpleQuery);
		});

		bench("query con parámetros (3 campos, 1 objeto)", () => {
			serialize(queryWithParams);
		});

		bench("query compleja (múltiples niveles)", () => {
			serialize(complexQuery);
		});
	});

	describe("peor caso: alto volumen simulado", () => {
		// Simula 1000 serializaciones consecutivas de queries típicas
		const queries = Array.from({ length: 1000 }, (_, i) => ({
			endpoint: "/users",
			params: { userId: i, timestamp: Date.now() },
		}));

		bench("1000 queries simples consecutivas", () => {
			for (const query of queries) {
				serialize(query);
			}
		});
	});
});

// ===== BENCHMARKS: extractTags =====

import { extractTags } from "../lib/utils/serialize";

describe("extractTags - rendimiento", () => {
	const simpleQuery = {
		endpoint: "/users",
		params: { userId: 123 },
	};

	const complexQuery = {
		endpoint: "/api/v1/users/search",
		method: "POST",
		params: {
			limit: 20,
			offset: 0,
			sort: "created_at",
		},
		body: {
			filters: {
				age: { min: 18, max: 65 },
				roles: ["admin", "user"],
				active: true,
			},
		},
	};

	bench("extractTags - query simple", () => {
		extractTags(simpleQuery);
	});

	bench("extractTags - query compleja", () => {
		extractTags(complexQuery);
	});
});

// ===== BENCHMARKS: CACHE =====

import { LRUCache } from "../lib/utils/lru-cache";

describe("serialize con caché - comparación", () => {
	// Query reutilizable (escenario real con cache hits)
	const reusableQuery = {
		endpoint: "/api/users",
		method: "GET",
		params: { limit: 10, offset: 0 },
	};

	const complexReusableQuery = {
		endpoint: "/api/v1/users/search",
		method: "POST",
		params: {
			limit: 20,
			offset: 0,
			sort: "created_at",
			order: "desc",
		},
		body: {
			filters: {
				age: { min: 18, max: 65 },
				roles: ["admin", "user", "moderator"],
				active: true,
			},
		},
	};

	describe("cache hit (mismo objeto reutilizado)", () => {
		const cache = new LRUCache<unknown, string>(1000);

		bench("CON caché - query simple (100% cache hit)", () => {
			serialize(reusableQuery, { cache });
		});

		bench("SIN caché - query simple", () => {
			serialize(reusableQuery);
		});

		bench("CON caché - query compleja (100% cache hit)", () => {
			serialize(complexReusableQuery, { cache });
		});

		bench("SIN caché - query compleja", () => {
			serialize(complexReusableQuery);
		});
	});

	describe("cache miss (objetos nuevos cada vez)", () => {
		const cache = new LRUCache<unknown, string>(1000);

		bench("CON caché - query nueva cada vez (0% cache hit)", () => {
			serialize(
				{
					endpoint: "/users",
					params: { userId: Math.random() },
				},
				{ cache },
			);
		});

		bench("SIN caché - query nueva cada vez", () => {
			serialize({
				endpoint: "/users",
				params: { userId: Math.random() },
			});
		});
	});

	describe("escenario real: 50% cache hit", () => {
		const query1 = { endpoint: "/users", method: "GET" };
		const query2 = { endpoint: "/posts", method: "GET" };
		const query3 = { endpoint: "/comments", method: "GET" };
		const cache = new LRUCache<unknown, string>(1000);

		bench("CON caché - mix de queries (50% hits)", () => {
			// Simula patrón: query1, query2, query1, query3, query1
			serialize(query1, { cache });
			serialize(query2, { cache });
			serialize(query1, { cache }); // hit
			serialize(query3, { cache });
			serialize(query1, { cache }); // hit
		});

		bench("SIN caché - mix de queries", () => {
			serialize(query1);
			serialize(query2);
			serialize(query1);
			serialize(query3);
			serialize(query1);
		});
	});

	describe("alto volumen con reutilización", () => {
		const popularQueries = Array.from({ length: 10 }, (_, i) => ({
			endpoint: `/api/resource${i}`,
			method: "GET",
		}));

		bench("CON caché - 1000 queries (10 queries distintas reutilizadas)", () => {
			const cache = new LRUCache<unknown, string>(1000);
			for (let i = 0; i < 1000; i++) {
				serialize(popularQueries[i % 10], { cache });
			}
		});

		bench("SIN caché - 1000 queries (10 queries distintas reutilizadas)", () => {
			for (let i = 0; i < 1000; i++) {
				serialize(popularQueries[i % 10]);
			}
		});
	});
});
