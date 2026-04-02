# Introducción a los Optics

## ¿Qué es un Optic?

Un **optic** es una abstracción composable para **acceder y modificar** partes de una estructura de datos de forma inmutable. En lugar de acceder directamente a propiedades anidadas (lo cual se vuelve difícil de mantener), los optics encapsulan el "camino" hacia un dato en un valor reutilizable y componible.

### El problema que resuelven

Imagina que tienes esta estructura:

```ts
interface Company {
  name: string;
  ceo: {
    name: string;
    age: number;
    address: {
      street: string;
      city: string;
      zip: string;
    };
  };
}
```

Para cambiar la calle del CEO de forma inmutable, necesitarías:

```ts
const updated = {
  ...company,
  ceo: {
    ...company.ceo,
    address: {
      ...company.ceo.address,
      street: "Nueva calle",
    },
  },
};
```

Con optics, esto se reduce a:

```ts
import { Lens } from "@oofp/focal";

const ceoStreetLens = pipe(
  Lens.identity<Company>(),
  Lens.prop("ceo"),
  Lens.prop("address"),
  Lens.prop("street"),
);

const updated = pipe(ceoStreetLens, Lens.set("Nueva calle"))(company);
```

La diferencia clave: el "camino" (`ceoStreetLens`) es un **valor de primera clase**. Puedes pasarlo como argumento, almacenarlo en una variable, componerlo con otros optics, y reutilizarlo en cualquier parte de tu programa.

## La jerarquía de optics

`@oofp/focal` implementa cuatro tipos de optics, ordenados del más fuerte (más capacidades) al más débil (más general):

```
Iso        el más fuerte — conversión total y reversible, exactamente 1 foco
 ↓
Lens       getter/setter total — exactamente 1 foco, siempre presente
 ↓
Prism      enfoque parcial — 0 o 1 foco, puede estar ausente
 ↓
Traversal  el más general — 0 a N focos
```

### ¿Qué significa "más fuerte"?

Un optic más fuerte puede hacer todo lo que hace uno más débil, pero no al revés:

- Un **Iso** puede convertirse en un Lens o un Prism (funciones `toLens`, `toPrism`).
- Un **Lens** siempre tiene un foco, así que es un caso especial de un Prism (que podría no tener foco).
- Un **Prism** tiene como máximo un foco, así que es un caso especial de un Traversal (que puede tener muchos).

### Cuándo usar cada uno

| Optic     | Focos | Ejemplo                                       |
|-----------|-------|-----------------------------------------------|
| Iso       | 1     | Celsius ↔ Fahrenheit, string ↔ char[]         |
| Lens      | 1     | `person.name`, `address.street`                |
| Prism     | 0-1   | `Maybe<A> → A`, `Either<E,A> → A`, arr[i]     |
| Traversal | 0-N   | Todos los elementos de un array, valores de un Record |

## Principios de diseño

### 1. Optic-flows-through-pipe

El optic fluye a través del pipe, y las operaciones reciben el **dato** como argumento:

```ts
// El optic es lo que fluye por el pipe:
const ageLens = pipe(Lens.identity<Person>(), Lens.prop("age"));

// Las operaciones reciben el dato, no el optic:
pipe(ageLens, Lens.view(alice));              // => 30
pipe(ageLens, Lens.set(31))(alice);           // => { ...alice, age: 31 }
pipe(ageLens, Lens.over(n => n + 1))(alice);  // => { ...alice, age: 31 }
```

Esto permite construir optics complejos con `pipe` de forma natural, componiendo combinadores como `prop`, y luego aplicar operaciones al final.

### 2. Inmutabilidad total

Ninguna operación muta el dato original. `set`, `over` y `modify` siempre retornan un valor nuevo:

```ts
const alice = { name: "Alice", age: 30 };
const ageLens = pipe(Lens.identity<Person>(), Lens.prop("age"));

const updated = pipe(ageLens, Lens.set(31))(alice);

console.log(alice.age);   // 30 — sin cambios
console.log(updated.age); // 31
```

### 3. Leyes matemáticas

Cada optic debe cumplir leyes que garantizan su buen comportamiento. Estas leyes no son académicas: son la razón por la que la composición funciona de forma predecible.

| Optic     | Leyes                                                       |
|-----------|-------------------------------------------------------------|
| Iso       | RoundTrip1: `from(to(a)) ≡ a`, RoundTrip2: `to(from(b)) ≡ b` |
| Lens      | GetPut, PutGet, PutPut                                       |
| Prism     | PreviewReview, ReviewPreview                                 |
| Traversal | Identity, Composition                                        |

### 4. Interfaces planas con tag discriminante

Los optics son objetos TypeScript simples — no hay clases, herencia, ni tipos nominales. Cada optic incluye un campo `tag` que permite la composición cruzada por discriminación en runtime:

```ts
const xLens: Lens<{ x: number; y: number }, number> = {
  tag: 'Lens',
  get: (point) => point.x,
  set: (x) => (point) => ({ ...point, x }),
};
```

El campo `tag` toma los valores `'Iso'`, `'Lens'`, `'Prism'` o `'Traversal'`, y es lo que permite que la función `compose` de cada módulo determine el tipo del resultado en runtime.

### 5. Dependencias mínimas

Solo depende de `@oofp/core` para `Maybe`, `Either` y `pipe`.

## Composición: la idea central

La composición es lo que hace a los optics verdaderamente poderosos. Cada módulo expone una función `compose` que es pipe-friendly y acepta optics de diferentes tipos:

```ts
// Lens<Person, Address> + Lens<Address, string> = Lens<Person, string>
const personStreet = pipe(addressLens, Lens.compose(streetLens));
```

Cuando se componen optics de **tipos diferentes**, el resultado siempre es el tipo más débil. La función `compose` de cada módulo usa el campo `tag` del optic destino para determinar el tipo del resultado:

| Externo    | Interno    | Resultado  |
|------------|------------|------------|
| Iso        | Iso        | Iso        |
| Iso        | Lens       | Lens       |
| Iso        | Prism      | Prism      |
| Iso        | Traversal  | Traversal  |
| Lens       | Lens       | Lens       |
| Lens       | Prism      | Prism      |
| Lens       | Traversal  | Traversal  |
| Prism      | Lens       | Prism      |
| Prism      | Prism      | Prism      |
| Prism      | Traversal  | Traversal  |
| Traversal  | Lens       | Traversal  |
| Traversal  | Prism      | Traversal  |
| Traversal  | Traversal  | Traversal  |

Esto es lógico: si alguna parte de la cadena puede fallar (Prism) o tener múltiples focos (Traversal), el resultado hereda esa limitación.

## Estructura del paquete

```
packages/focal/lib/
├── index.ts           # Re-exporta todo como namespaces (Lens, Prism, Iso, Traversal, Focal)
├── iso.ts             # Iso<A, B> — isomorfismos (tipo, constructores, operaciones, composición)
├── lens.ts            # Lens<S, A> — getter/setter totales
├── prism.ts           # Prism<S, A> — enfoque parcial
├── traversal.ts       # Traversal<S, A> — múltiples focos
└── focal/
    ├── index.ts       # Punto de entrada de la API Focal
    ├── types.ts       # Tipo Focal<F, S, A>
    ├── methods.ts     # Entry points, navegadores y terminators
    └── compose.ts     # Composición type-safe entre Focals
```

Cada módulo de optic contiene el tipo, constructores, operaciones y su propia función `compose` con overloads para composición cruzada. No hay un archivo de composición separado.

El directorio `focal/` contiene la **API Focal**: una capa ergonómica sobre los optics puros que permite encadenar cualquier combinación de optics en un único pipe uniforme, con inferencia de tipos automática.

## Orden de lectura recomendado

1. **[Iso](./02-iso.md)** — Empezar por el más simple: una conversión ida y vuelta.
2. **[Lens](./03-lens.md)** — El optic más usado: acceder a propiedades.
3. **[Prism](./04-prism.md)** — Cuando el foco podría no existir.
4. **[Traversal](./05-traversal.md)** — Cuando hay múltiples focos.
5. **[Composición](./06-composicion.md)** — Combinar diferentes tipos de optics.
6. **[API Focal](./07-focal-api.md)** — La capa ergonómica: encadenar optics con un pipe limpio y uniforme. **Leer después de entender los optics puros.**

Cada documento incluye:
- Explicación conceptual con analogías
- La interfaz TypeScript (incluyendo el campo `tag`)
- Las leyes que debe cumplir
- Constructores disponibles
- Operaciones (view, set, over, etc.)
- Composición
- Ejemplos del código fuente y los tests
