# La API Focal — Ergonomía para optics

> **Archivos fuente:** `lib/focal/index.ts`, `lib/focal/methods.ts`, `lib/focal/compose.ts`, `lib/focal/types.ts`
> **Tests:** `tests/focal/`

## ¿Qué es la API Focal?

Los optics puros (`Lens`, `Prism`, `Traversal`, `Iso`) son poderosos pero algo verbosos cuando necesitas encadenar varios pasos. Cada vez que cambias de tipo de optic, tienes que cambiar el módulo que usas:

```ts
// Con optics puros — tienes que gestionar los módulos manualmente
const result = pipe(
  L.identity<Company>(),
  L.prop("departments"),         // Lens<Company, Department[]>
  L.compose(T.each<Department>()),  // cambia a Traversal.compose
  T.compose(L.make(
    (d) => d.budget,
    (b) => (d) => ({ ...d, budget: b }),
  )),
  T.modify((n) => n * 2),
  call(acme),
);
```

La **API Focal** resuelve esto: envuelve cualquier optic en un `Focal<F, S, A>` y expone un conjunto uniforme de combinadores. El mismo pipe, las mismas funciones, independientemente del tipo de optic subyacente:

```ts
// Con la API Focal — un pipe limpio de principio a fin
const result = pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.prop("budget"),
  Focal.modify((n) => n * 2),
  Focal.run(acme),
);
```

El sistema de tipos infiere automáticamente el tipo del `Focal` en cada paso: si en algún punto de la cadena entras en un `Prism`, el `Focal` resultante es `Focal<Prism, ...>`. Si luego encadenas un `Traversal`, pasa a `Focal<Traversal, ...>`. No tienes que pensar en ello.

## El tipo `Focal<F, S, A>`

```ts
type Focal<F extends URIS, S, A> = {
  readonly tag: "Focal";
  readonly optic: Kind<F, S, A>;
};
```

Un `Focal` es simplemente un wrapper con dos campos:
- `tag: "Focal"` — discriminante literal.
- `optic: Kind<F, S, A>` — el optic subyacente (`Lens<S,A>`, `Prism<S,A>`, etc.), accesible via `toOptic`.

El parámetro `F` puede ser `Lens.URI`, `Prism.URI`, `Traversal.URI` o `Iso.URI`.

## Entry points — cómo empezar una cadena

### `from<S>(): Focal<Lens.URI, S, S>`

El punto de entrada más común. Crea un `Focal` con el Lens identidad: enfoca el valor completo `S`.

```ts
const f = Focal.from<Person>();
// Focal<Lens, Person, Person>

pipe(f, Focal.prop("name"), Focal.get(alice));
// => "Alice"
```

### `fromEach<A>(): Focal<Traversal.URI, A[], A>`

Punto de entrada cuando el dato raíz es un array. Equivale a empezar con `Traversal.each<A>()`.

```ts
type Shape = { kind: "circle" | "rect"; r?: number };

pipe(
  Focal.fromEach<Shape>(),
  Focal.match("kind", "circle"),
  Focal.prop("r"),
  Focal.collect([{ kind: "circle", r: 5 }, { kind: "rect" }]),
);
// => [5]
```

### `fromOptic(optic): Focal<F, S, A>`

Envuelve un optic puro ya existente para usarlo en la API Focal. Acepta `Lens`, `Prism`, `Iso` o `Traversal`.

```ts
const ageLens = pipe(L.identity<Person>(), L.prop("age"));

pipe(Focal.fromOptic(ageLens), Focal.modify((n) => n + 1), Focal.run(alice));
// => { name: "Alice", age: 31 }
```

Útil cuando ya tienes optics construidos con los módulos puros y quieres usarlos en un pipe Focal.

### `toOptic(focal): Kind<F, S, A>`

Extrae el optic subyacente de un `Focal`. Permite construir optics complejos con la API Focal y luego usarlos directamente.

```ts
const rawLens = pipe(
  Focal.from<Company>(),
  Focal.prop("ceo"),
  Focal.prop("age"),
  Focal.toOptic,
);
// rawLens: Lens<Company, number>

if (rawLens.tag === "Lens") {
  rawLens.get(acme);          // => 45
  rawLens.set(50)(acme);      // => { ...acme, ceo: { ...acme.ceo, age: 50 } }
}
```

---

## Navegación — cómo moverse por la estructura

Los **navegadores** son combinadores pipe-friendly que toman un `Focal` y devuelven un `Focal` más profundo. El tipo resultante se calcula automáticamente.

### `prop(key)` — acceder a un campo

Navega a la propiedad `key` del foco actual. Si el `Focal` es un `Lens`, el resultado también es un `Lens`. Si es un `Prism` o `Traversal`, el resultado mantiene ese tipo.

```ts
// Lens → Lens
const age = pipe(Focal.from<Person>(), Focal.prop("age"));
// Focal<Lens, Person, number>

// Traversal → Traversal (prop dentro de each)
const budgets = pipe(
  Focal.from<Company>(),
  Focal.each("departments"),   // Focal<Traversal, Company, Department>
  Focal.prop("budget"),        // Focal<Traversal, Company, number>
);
```

### `optional(key)` — campo que puede ser `null` o `undefined`

Navega a una propiedad que podría ser `null | undefined`. Si el valor es nulo/indefinido, las operaciones se convierten en no-ops. El resultado es siempre un `Prism` (o `Traversal` si viene de uno).

```ts
type User = { name: string; address: { city: string; zip: string } | null };

// Cuando address existe:
pipe(
  Focal.from<User>(),
  Focal.optional("address"),
  Focal.prop("city"),
  Focal.preview({ name: "Alice", address: { city: "NYC", zip: "10001" } }),
);
// => Just("NYC")

// Cuando address es null:
pipe(
  Focal.from<User>(),
  Focal.optional("address"),
  Focal.prop("city"),
  Focal.preview({ name: "Bob", address: null }),
);
// => Nothing

// Modify es no-op cuando el campo es null:
pipe(
  Focal.from<User>(),
  Focal.optional("address"),
  Focal.modify((addr) => ({ ...addr, city: "LA" })),
  Focal.run({ name: "Bob", address: null }),
);
// => { name: "Bob", address: null }  — sin cambios
```

`optional` es especialmente potente al combinarse con `each`:

```ts
type Team = { members: User[] };

// Recolecta las ciudades solo de los miembros con dirección
pipe(
  Focal.from<Team>(),
  Focal.each("members"),
  Focal.optional("address"),
  Focal.prop("city"),
  Focal.collect(team),
);
// => ["NYC", "NYC"]  — los null se omiten automáticamente
```

### `each(key)` — iterar sobre todos los elementos de un array

Atajo para `prop(key)` + traversal sobre el array. El resultado es siempre `Traversal`.

```ts
// Todos los salarios de todos los empleados en todos los departamentos:
pipe(
  Focal.from<Company>(),
  Focal.each("departments"),    // Focal<Traversal, Company, Department>
  Focal.each("employees"),      // Focal<Traversal, Company, Employee>
  Focal.prop("salary"),         // Focal<Traversal, Company, number>
  Focal.collect(acme),
);
// => [100_000, 80_000, 90_000]
```

### `eachRecord(key)` — iterar sobre los valores de un `Record`

Análogo a `each`, pero para campos que son `Record<string, V>`. Itera sobre los valores preservando las claves.

```ts
type Org = {
  name: string;
  divisions: Record<string, { budget: number; headcount: number }>;
};

// Todos los budgets
pipe(
  Focal.from<Org>(),
  Focal.eachRecord("divisions"),
  Focal.prop("budget"),
  Focal.collect(org),
);
// => [500_000, 200_000, 100_000]

// Modificar todos los budgets
pipe(
  Focal.from<Org>(),
  Focal.eachRecord("divisions"),
  Focal.prop("budget"),
  Focal.modify((n) => n * 2),
  Focal.run(org),
);
// => { ...org, divisions: { eng: { budget: 1_000_000, ... }, ... } }
```

### `index(i)` — acceder al elemento `i` de un array

Devuelve un `Prism` que apunta al elemento en la posición `i`. Si el índice está fuera de rango, todas las operaciones son no-ops.

```ts
// Leer — Just cuando existe, Nothing cuando no
pipe(Focal.from<string[]>(), Focal.index(1), Focal.preview(["a", "b", "c"]));
// => Just("b")

pipe(Focal.from<string[]>(), Focal.index(5), Focal.preview(["a", "b"]));
// => Nothing

// Modificar solo el elemento en posición i
pipe(
  Focal.from<number[]>(),
  Focal.index(1),
  Focal.modify((n) => n * 10),
  Focal.run([1, 2, 3]),
);
// => [1, 20, 3]

// Encadenar con prop tras index
pipe(
  Focal.from<Company>(),
  Focal.prop("departments"),
  Focal.index(1),
  Focal.prop("name"),
  Focal.preview(acme),
);
// => Just("Sales")
```

### `indexRecord(key)` — acceder al valor de un `Record<string, V>` por clave

Devuelve un `Prism` que apunta al valor asociado a `key` en un `Record<string, V>`. Si la clave no existe en runtime, todas las operaciones son no-ops.

**Diferencia clave con `prop`:** `prop` opera sobre tipos con campos conocidos en tiempo de compilación (garantiza que la clave existe, devuelve un `Lens`). `indexRecord` opera sobre mapas dinámicos `Record<string, V>` donde la clave puede no existir en runtime, por eso devuelve un `Prism`.

```ts
type Catalog = Record<string, number>;
const catalog: Catalog = { apples: 10, bananas: 5, cherries: 80 };

// preview — Just cuando la clave existe, Nothing cuando no
pipe(Focal.from<Catalog>(), Focal.indexRecord("bananas"), Focal.preview(catalog));
// => Just(5)

pipe(Focal.from<Catalog>(), Focal.indexRecord("mangoes"), Focal.preview(catalog));
// => Nothing

// modify — actualiza solo la clave objetivo, no-op si está ausente
pipe(
  Focal.from<Catalog>(),
  Focal.indexRecord("apples"),
  Focal.modify((n) => n * 2),
  Focal.run(catalog),
);
// => { apples: 20, bananas: 5, cherries: 80 }

// set
pipe(Focal.from<Catalog>(), Focal.indexRecord("cherries"), Focal.set(999), Focal.run(catalog));
// => { apples: 10, bananas: 5, cherries: 999 }

// has
pipe(Focal.from<Catalog>(), Focal.indexRecord("apples"), Focal.has(catalog));  // => true
pipe(Focal.from<Catalog>(), Focal.indexRecord("mangoes"), Focal.has(catalog)); // => false

// Encadenado con prop
type Store = { inventory: Catalog };
pipe(
  Focal.from<Store>(),
  Focal.prop("inventory"),
  Focal.indexRecord("bananas"),
  Focal.preview({ inventory: catalog }),
);
// => Just(5)
```

Cuando el valor de la clave es un array, se puede encadenar con `index(i)` para acceder a un elemento concreto, o con `elements()` para traversar todos:

```ts
type Store = Record<string, number[]>;
const store: Store = { apples: [1, 2, 3], bananas: [4, 5] };

// Elemento concreto — Prism
pipe(Focal.from<Store>(), Focal.indexRecord("apples"), Focal.index(0), Focal.preview(store));
// => Just(1)

// Todos los elementos — Traversal
pipe(
  Focal.from<Store>(),
  Focal.indexRecord("apples"),
  Focal.elements(),
  Focal.modify((n) => n * 10),
  Focal.run(store),
);
// => { apples: [10, 20, 30], bananas: [4, 5] }
```

### `elements()` — traversar todos los elementos del array en foco

Cuando el foco actual ya es un array (`A[]`), `elements()` crea un `Traversal` sobre todos sus elementos. A diferencia de `each(key)`, no necesita un nombre de campo — opera directamente sobre el array que está en foco.

```ts
// Sobre un Lens (from → prop → elements)
type Bag = { items: string[] };
const bag: Bag = { items: ["a", "b", "c"] };

pipe(
  Focal.from<Bag>(),
  Focal.prop("items"),      // Focal<Lens, Bag, string[]>
  Focal.elements(),         // Focal<Traversal, Bag, string>
  Focal.modify((s) => s.toUpperCase()),
  Focal.run(bag),
);
// => { items: ["A", "B", "C"] }

// Sobre un Prism (indexRecord → elements)
type Store = Record<string, number[]>;
const store: Store = { apples: [1, 2, 3], bananas: [4, 5] };

pipe(
  Focal.from<Store>(),
  Focal.indexRecord("apples"),  // Focal<Prism, Store, number[]>
  Focal.elements(),             // Focal<Traversal, Store, number>
  Focal.collect(store),
);
// => [1, 2, 3]

// No-op cuando la clave no existe
pipe(
  Focal.from<Store>(),
  Focal.indexRecord("mangoes"),
  Focal.elements(),
  Focal.modify((n) => n * 10),
  Focal.run(store),
);
// => { apples: [1, 2, 3], bananas: [4, 5] }  — sin cambios
```

**Cuándo usar `each(key)` vs `elements()`:**

| | `each(key)` | `elements()` |
|---|---|---|
| El array está en una propiedad del foco | `Focal.each("items")` | — |
| El foco ya es el array | — | `Focal.elements()` |
| Típicamente después de | `from`, `prop` | `prop`, `indexRecord`, `index` |

### `match(tagKey, tagValue)` — filtrar por variante de unión discriminada

Navega hasta una variante específica de una unión discriminada. Si el valor es otra variante, las operaciones son no-ops. TypeScript narrowea automáticamente el tipo del foco.

```ts
type Shape = { kind: "circle"; r: number } | { kind: "rect"; w: number; h: number };

// Forma inline: match(tagKey, tagValue)
pipe(
  Focal.fromEach<Shape>(),
  Focal.match("kind", "circle"),
  Focal.prop("r"),              // ✓ TypeScript sabe que r existe en Circle
  Focal.modify((r) => r * 2),
  Focal.run(shapes),
);
// => [{ kind: "circle", r: 10 }, { kind: "rect", w: 3, h: 4 }, { kind: "circle", r: 20 }]
```

**Forma con tipo explícito para matchers parciales reutilizables:**

```ts
// Fija el tipo de unión, deja el tagKey y tagValue para después
const byKind = Focal.match<Shape>()("kind");

// Ahora puedes reutilizar el matcher parcial:
pipe(Focal.fromEach<Shape>(), byKind("circle"), Focal.prop("r"), Focal.collect(shapes));
pipe(Focal.fromEach<Shape>(), byKind("rect"), Focal.prop("w"), Focal.collect(shapes));
```

### `filter(pred)` — traversal condicional

Filtra los focos actuales según un predicado. El resultado es siempre `Traversal`. Los elementos que no cumplan el predicado se omiten en lecturas y se dejan sin cambios en escrituras.

```ts
// Solo departamentos con budget > 300_000
pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.filter((d) => d.budget > 300_000),
  Focal.prop("budget"),
  Focal.modify((n) => n * 2),
  Focal.run(acme),
);
// Engineering: 500_000 → 1_000_000 (duplicado)
// Sales: 200_000 → sin cambios (no cumple el predicado)

// Combinar filter con each — solo empleados de Engineering
pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.filter((d) => d.name === "Engineering"),
  Focal.each("employees"),
  Focal.prop("salary"),
  Focal.collect(acme),
);
// => [100_000, 80_000]
```

### `compose(focal)` — composición explícita con otro Focal

Cuando los atajos (`each`, `optional`, `match`...) no son suficientes, usa `compose` para encadenar cualquier `Focal` directamente. El tipo resultado sigue la regla del optic más débil.

```ts
import * as T from "@oofp/focal/traversal";

// Lens + Traversal = Traversal
pipe(
  Focal.from<Company>(),
  Focal.prop("departments"),
  Focal.compose(Focal.fromOptic(T.each<Department>())),
  Focal.prop("budget"),
  Focal.collect(acme),
);
// => [500_000, 200_000]
```

---

## Tabla de composición de tipos

El tipo del `Focal` resultante se calcula automáticamente según la regla del optic más débil:

| Focal entrada | Navegador | Focal resultado |
|---|---|---|
| `Focal<Lens, ...>` | `prop` | `Focal<Lens, ...>` |
| `Focal<Prism, ...>` | `prop` | `Focal<Prism, ...>` |
| `Focal<Traversal, ...>` | `prop` | `Focal<Traversal, ...>` |
| `Focal<Lens, ...>` | `optional` | `Focal<Prism, ...>` |
| `Focal<Traversal, ...>` | `optional` | `Focal<Traversal, ...>` |
| `Focal<Lens, ...>` | `each` | `Focal<Traversal, ...>` |
| `Focal<Lens, ...>` | `index` | `Focal<Prism, ...>` |
| `Focal<Traversal, ...>` | `index` | `Focal<Traversal, ...>` |
| `Focal<Lens, ...>` | `indexRecord` | `Focal<Prism, ...>` |
| `Focal<Traversal, ...>` | `indexRecord` | `Focal<Traversal, ...>` |
| `Focal<Lens, ...>` | `elements` | `Focal<Traversal, ...>` |
| `Focal<Prism, ...>` | `elements` | `Focal<Traversal, ...>` |
| `Focal<Traversal, ...>` | `elements` | `Focal<Traversal, ...>` |
| `Focal<Lens, ...>` | `match` | `Focal<Prism, ...>` |
| `Focal<Traversal, ...>` | `match` | `Focal<Traversal, ...>` |
| Cualquiera | `filter` | `Focal<Traversal, ...>` |

---

## Terminators — extraer valores y aplicar cambios

Los terminators son el final de la cadena. Hay dos estilos:

### Terminators data-last (el dato va al final, con `run`)

Estos terminators devuelven **funciones** — no ejecutan inmediatamente. Se usan dentro de `pipe` y se aplican con `run(s)`:

```ts
// modify devuelve (s: S) => S
pipe(
  Focal.from<Company>(),
  Focal.prop("ceo"),
  Focal.prop("age"),
  Focal.modify((n) => n + 1),   // => (company: Company) => Company
  Focal.run(acme),              // aplica la función a acme
);
```

| Terminator | Tipo devuelto | Descripción |
|---|---|---|
| `modify(f)` | `(s: S) => S` | Modifica cada foco con `f`. Es no-op en focos ausentes. |
| `set(a)` | `(s: S) => S` | Reemplaza cada foco con el valor `a`. |
| `fold(init, f)` | `(s: S) => B` | Reduce todos los focos con un acumulador. |

#### `run(s)` — aplicar el updater al dato

`run` no es exactamente un terminator: convierte `pipe` en un bloque ejecutable que aplica el resultado al valor `s`. Sirve para que el pipe completo sea legible de principio a fin.

```ts
// Sin run — la función queda sin aplicar:
const updater = pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.prop("budget"),
  Focal.modify((n) => n * 2),
);
// updater: (company: Company) => Company
updater(acme); // aplicación manual

// Con run — se aplica inline:
pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.prop("budget"),
  Focal.modify((n) => n * 2),
  Focal.run(acme),
);
```

### Terminators data-first (el dato va primero)

Estos terminators reciben el dato `s` como primer argumento (data-first). Apropiados cuando el dato ya está disponible antes de construir la cadena.

| Terminator | Disponible para | Tipo devuelto | Descripción |
|---|---|---|---|
| `get(s)` | `Focal<Lens>` o `Focal<Iso>` | `A` | Extrae el foco. Garantiza exactamente 1 resultado. |
| `preview(s)` | `Focal<Prism>` | `Maybe<A>` | Intenta extraer el foco. Devuelve `Just(a)` o `Nothing`. |
| `collect(s)` | Cualquier `Focal` | `A[]` | Recolecta todos los focos en un array. |
| `has(s)` | Cualquier `Focal` | `boolean` | Devuelve `true` si hay al menos un foco. |
| `count(s)` | Cualquier `Focal` | `number` | Cuenta el número de focos. |

```ts
// get — solo para Lens/Iso, garantiza 1 resultado
pipe(Focal.from<Company>(), Focal.prop("ceo"), Focal.prop("age"), Focal.get(acme));
// => 45

// preview — para Prism, devuelve Maybe
pipe(Focal.from<Company>(), Focal.prop("departments"), Focal.index(0), Focal.preview(acme));
// => Just({ name: "Engineering", ... })

// collect — funciona con cualquier Focal
pipe(Focal.from<Company>(), Focal.each("departments"), Focal.collect(acme));
// => [{ name: "Engineering", ... }, { name: "Sales", ... }]

// has / count
pipe(Focal.from<Company>(), Focal.each("departments"), Focal.has(acme));   // => true
pipe(Focal.from<Company>(), Focal.each("departments"), Focal.count(acme)); // => 2
```

### ¿Cuándo usar data-last vs data-first?

| Data-last (`modify`, `set`, `fold`, `run`) | Data-first (`get`, `preview`, `collect`) |
|---|---|
| El dato llega al final del pipe | El dato está disponible antes de construir el pipe |
| Útil para construir updaters reutilizables | Útil para lectura inmediata |
| `pipe(Focal.from<T>(), ..., Focal.modify(f), Focal.run(s))` | `pipe(Focal.from<T>(), ..., Focal.get(s))` |

---

## Ejemplo end-to-end: estructura de empresa

El siguiente ejemplo ilustra una cadena larga (6 pasos) que combina navegadores y terminators:

```ts
import { pipe } from "@oofp/core/pipe";
import * as Focal from "@oofp/focal";

type Person     = { name: string; age: number };
type Address    = { city: string; zip: string };
type Employee   = { person: Person; address: Address; salary: number };
type Department = { name: string; employees: Employee[]; budget: number };
type Company    = { name: string; ceo: Person; departments: Department[] };

const acme: Company = {
  name: "Acme",
  ceo: { name: "Bob", age: 45 },
  departments: [
    {
      name: "Engineering",
      employees: [
        { person: { name: "Alice", age: 30 }, address: { city: "NYC", zip: "10001" }, salary: 100_000 },
        { person: { name: "Charlie", age: 25 }, address: { city: "LA", zip: "90001" }, salary: 80_000 },
      ],
      budget: 500_000,
    },
    {
      name: "Sales",
      employees: [
        { person: { name: "Diana", age: 35 }, address: { city: "Chicago", zip: "60601" }, salary: 90_000 },
      ],
      budget: 200_000,
    },
  ],
};

// ── Lectura ────────────────────────────────────────────────────────────────

// Todos los nombres de empleados (6 pasos)
pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.each("employees"),
  Focal.prop("person"),
  Focal.prop("name"),
  Focal.collect(acme),
);
// => ["Alice", "Charlie", "Diana"]

// Total de salarios
pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.each("employees"),
  Focal.prop("salary"),
  Focal.fold(0, (acc, n) => acc + n),
  Focal.run(acme),
);
// => 270_000

// CEO's age
pipe(Focal.from<Company>(), Focal.prop("ceo"), Focal.prop("age"), Focal.get(acme));
// => 45

// ── Escritura ──────────────────────────────────────────────────────────────

// Subida de sueldo para todos
pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.each("employees"),
  Focal.prop("salary"),
  Focal.modify((n) => n * 1.1),
  Focal.run(acme),
);

// Doblar el budget de los departamentos con más de 300k
pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.filter((d) => d.budget > 300_000),
  Focal.prop("budget"),
  Focal.modify((n) => n * 2),
  Focal.run(acme),
);
// Engineering: 1_000_000, Sales: 200_000 (sin cambios)

// Renombrar al CEO
pipe(
  Focal.from<Company>(),
  Focal.prop("ceo"),
  Focal.prop("name"),
  Focal.set("Robert"),
  Focal.run(acme),
);
```

---

## Caso de uso real: normalized store

La API Focal brilla especialmente al trabajar con respuestas de API normalizadas donde hay múltiples tipos de entidades mezcladas en un solo array. El ejemplo a continuación simula una respuesta de perfil de candidato (estilo LinkedIn):

```ts
// types.ts — cada entidad tiene un $type discriminante
type IncludedEntity = SkillEntity | PositionEntity | CertificationEntity | ProfileEntity | ...;

// domain.ts — definición de focals reutilizables
export const skillFocal = pipe(
  Focal.from<IncludedEntity>(),
  Focal.match<IncludedEntity>()("$type")("com.linkedin.voyager.dash.identity.profile.Skill"),
);

export const positionFocal = pipe(
  Focal.from<IncludedEntity>(),
  Focal.match<IncludedEntity>()("$type")("com.linkedin.voyager.dash.identity.profile.Position"),
);

// Uso — recolectar todos los títulos de posición
pipe(
  Focal.fromEach<IncludedEntity>(),
  Focal.compose(positionFocal),
  Focal.prop("title"),
  Focal.collect(response.included),
);
// => ["Founder & CTO", "CTO", "Tech Lead / Senior Software Engineer"]

// Uso — recolectar todos los nombres de habilidades
pipe(
  Focal.fromEach<IncludedEntity>(),
  Focal.compose(skillFocal),
  Focal.prop("name"),
  Focal.collect(response.included),
);
// => ["Scrum", "Artificial Intelligence (AI)", "Machine Learning", ...]

// Uso — mapear a un dominio propio
export function toCandidateProfile(response: NormalizedStoreResponse): CandidateProfile {
  const { included } = response;

  return {
    name: `${getFirst("Profile", "firstName")} ${getFirst("Profile", "lastName")}`,
    skills: pipe(
      Focal.fromEach<IncludedEntity>(),
      Focal.compose(skillFocal),
      Focal.prop("name"),
      Focal.collect(included),
    ),
    jobTitles: pipe(
      Focal.fromEach<IncludedEntity>(),
      Focal.compose(positionFocal),
      Focal.prop("title"),
      Focal.collect(included),
    ),
    // ...
  };
}
```

Los focals reutilizables (`skillFocal`, `positionFocal`, etc.) se definen una vez y se componen libremente con `Focal.compose`. Esto es imposible con pattern matching manual y muy verboso con optics puros directos.

---

## Resumen

| Categoría | Función | Descripción |
|---|---|---|
| **Entry points** | `from<S>()` | Inicia con identidad Lens sobre `S` |
| | `fromEach<A>()` | Inicia con `Traversal.each<A>()` sobre `A[]` |
| | `fromOptic(optic)` | Envuelve un optic puro existente |
| | `toOptic(focal)` | Extrae el optic subyacente |
| **Navegación** | `prop(key)` | Accede a un campo (preserva el tipo del Focal) |
| | `optional(key)` | Campo nullable/undefined → Prism/Traversal |
| | `each(key)` | Array → Traversal |
| | `eachRecord(key)` | Record → Traversal |
| | `index(i)` | Elemento en posición `i` → Prism |
| | `indexRecord(key)` | Valor en clave `key` de un `Record<string,V>` → Prism |
| | `elements()` | Todos los elementos del array en foco → Traversal |
| | `match(tagKey, tagValue)` | Variante de unión discriminada → Prism/Traversal |
| | `filter(pred)` | Filtrado condicional → Traversal |
| | `compose(focal)` | Composición explícita con otro Focal |
| **Data-last** | `modify(f)` | Modifica focos → `(s: S) => S` |
| | `set(a)` | Reemplaza focos → `(s: S) => S` |
| | `fold(init, f)` | Reduce focos → `(s: S) => B` |
| | `run(s)` | Aplica el updater al dato `s` |
| **Data-first** | `get(s)` | Lee el foco (solo Lens/Iso) → `A` |
| | `preview(s)` | Lee el foco (Prism) → `Maybe<A>` |
| | `collect(s)` | Recolecta todos los focos → `A[]` |
| | `has(s)` | ¿Hay al menos un foco? → `boolean` |
| | `count(s)` | Número de focos → `number` |

---

## Rendimiento

La Focal API tiene un costo de abstracción real en runtime. Estos son los ratios aproximados frente a código imperativo equivalente, medidos con Vitest bench sobre un fixture real de respuesta normalizada de API (formato LinkedIn Voyager Dash, ~22 entidades de 8 tipos distintos):

| Escenario | Focal API | Optics puras | Imperativo |
|---|--:|--:|--:|
| Lectura simple (`get`) | ~6x más lento | ~1.7x más lento | referencia |
| Update profundo (`modify + run`) | ~8x más lento | ~4.7x más lento | referencia |
| Filtrado por tipo (`collect`) | ~8x más lento | ~5.6x más lento | referencia |
| Mapeo de dominio completo | ~13x más lento | ~7.3x más lento | referencia |

### Por qué estos números no son el problema

La diferencia más grande es en el mapeo de dominio completo: la Focal API tarda ~11 µs por llamada; el imperativo tarda ~0.86 µs. Una respuesta HTTP típica tiene **50,000–200,000 µs** de latencia de red. Esta transformación, que ocurre una vez por respuesta, representa **menos del 0.02%** del tiempo total.

La Focal API es más lenta que las optics puras en este escenario porque el patrón idiomático construye cada `pipe(Focal.from<T>(), ...)` en el momento de la llamada, sin reutilizar composiciones pre-construidas a nivel de módulo. Las optics puras pre-construyen sus traversals como constantes — ese es exactamente el tradeoff entre los dos estilos.

### Lo que no mide el benchmark de rendimiento

El benchmark de runtime compara velocidad de ejecución. Hay un segundo análisis estático que compara los tres enfoques en términos de mantenibilidad:

| Métrica | Imperativo | Optics puras | Focal API |
|---|--:|--:|--:|
| Type guards (`function isXxx(): e is T`) | **7** | 0 | 0 |
| Líneas con spread (`...`) | 2 | 1 | **0** |
| Puntos de acoplamiento al schema | 7 | 21 | 22 |
| Llamadas a `.filter()` | **9** | 1 | 1 |
| Composiciones reutilizables en el módulo | 0 | **10** | 7 |

El imperativo requiere 7 type guards manuales — uno por variante de la unión — y 9 llamadas a `.filter()`. Cada guard es una string hardcodeada que el compilador no puede verificar. La Focal API elimina ambas categorías de boilerplate: `Focal.match` deriva la discriminación del tipo TypeScript directamente.

Para el análisis completo con metodología y datos crudos, ver la [referencia de benchmarks](https://oofp.pages.dev/reference/benchmarks#oofpfocal--optics-vs-imperative) en la documentación del sitio.

### Escalabilidad

El overhead de la Focal API **no crece** con el tamaño de la colección — al contrario, se diluye. Al medir el ratio imperativo/Focal API con colecciones de 22, 220, 1,100 y 5,500 entidades, el resultado es que el gap se cierra a medida que n aumenta:

| Escenario | ×1 (22 ent.) | ×10 (220) | ×50 (1,100) | ×250 (5,500) |
|---|--:|--:|--:|--:|
| `filterByType` | 7.6x | 6.1x | 5.8x | 2.6x |
| `deepUpdate` | 8.5x | 6.8x | 6.2x | 3.9x |
| `domainMapping` | 12.8x | 8.2x | 7.5x | 7.4x |

La razón: la Focal API tiene un costo fijo por llamada (construir el pipe) más un costo O(n) de iteración, igual que el imperativo. A medida que n crece, el O(n) compartido domina y el costo fijo se vuelve una fracción cada vez menor del total. No hay penalización asintótica — la Focal API escala exactamente igual que el imperativo.

### Rutas pre-construidas

Si una ruta Focal aparece en un hot path medido con profiler, extraerla a una constante de módulo recupera una parte significativa del overhead:

```ts
// Patrón idiomático — el pipe se construye en cada llamada
function readAccess(profile: ProfileEntity) {
  return pipe(Focal.from<ProfileEntity>(), Focal.prop("firstName"), Focal.get(profile));
}

// Ruta pre-construida — la constante se define una vez, solo el terminador varía
const firstNameFocal = pipe(Focal.from<ProfileEntity>(), Focal.prop("firstName"));

function readAccess(profile: ProfileEntity) {
  return pipe(firstNameFocal, Focal.get(profile));
}
```

Mejora observada frente al patrón idiomático:

| Escenario | Focal pre-built | Optics pre-built |
|---|--:|--:|
| Lectura simple (`get`) | **2.7x más rápido** | 3.8x más rápido |
| Collect (`filterByType`) | **1.3x más rápido** | 1.4x más rápido |
| Modify + run (`deepUpdate`) | **1.5x más rápido** | 1.6x más rápido |

El Focal pre-built prácticamente iguala a las optics puras pre-built en todos los escenarios de traversal — la diferencia residual es solo el wrapper del Focal sobre el optic subyacente. La mejora es mayor en reads simples (donde la construcción domina el costo) y menor en traversals grandes (donde la iteración domina).

**Guía práctica:** en código de aplicación normal, el patrón idiomático es suficiente. Si un profiler muestra una ruta Focal como cuello de botella, extraerla a una constante de módulo es la optimización correcta — sin cambiar la API ni el estilo declarativo del código.

---

**Anterior:** [Composición](./06-composicion.md) — Combinar diferentes tipos de optics directamente
