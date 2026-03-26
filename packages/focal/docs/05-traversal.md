# Traversal — Múltiples focos

> **Archivo fuente:** `lib/traversal.ts`
> **Tests:** `tests/traversal/`

## ¿Qué es un Traversal?

Un **Traversal** enfoca **cero o más** partes `A` dentro de un todo `S`. Es el optic más general (más débil) en la jerarquía:

- Un **Lens** enfoca exactamente 1 parte (siempre presente)
- Un **Prism** enfoca 0 o 1 parte (puede estar ausente)
- Un **Traversal** enfoca 0 a N partes (puede haber ninguna, una o muchas)

### Analogía

Piensa en un Traversal como un "mapa selectivo": visita ciertos elementos de una estructura, los puede leer o transformar, y reconstruye la estructura completa.

### Insight de diseño clave

La operación primitiva es `modify`, no `toArray`. `modify` visita cada foco, aplica una función, y reconstruye el todo en **un solo paso** — sin crear arrays intermedios. Esto es eficiente y preserva la estructura.

## Interfaz

```ts
interface Traversal<S, A> {
  readonly tag: 'Traversal';
  readonly modify:  (f: (a: A) => A) => (s: S) => S;  // modificar cada foco en un paso
  readonly toArray: (s: S) => A[];                      // recolectar todos los focos
}
```

El campo `tag` es un discriminante literal usado internamente para la composición cruzada.

## Leyes

### Identity: `modify(id)(s) ≡ s`

Modificar con la función identidad no cambia nada.

```ts
const t = Traversal.each<number>();

t.modify(x => x)([1, 2, 3]);
// => [1, 2, 3] (sin cambios)

t.modify(x => x)([]);
// => [] (funciona con vacíos también)
```

### Composition: `modify(f)(modify(g)(s)) ≡ modify(x => f(g(x)))(s)`

Modificar dos veces es lo mismo que modificar una vez con las funciones compuestas.

```ts
const f = (n: number) => n * 2;
const g = (n: number) => n + 10;
const data = [1, 2, 3, 4, 5];

// Paso a paso:
t.modify(f)(t.modify(g)(data));
// => [22, 24, 26, 28, 30]

// Compuesto:
t.modify(x => f(g(x)))(data);
// => [22, 24, 26, 28, 30]  — mismo resultado
```

## Crear un Traversal manualmente

Un Traversal es un objeto con `tag`, `modify` y `toArray`. Puedes construirlo manualmente o usar `Traversal.make`:

```ts
// Traversal sobre ambos componentes de un par [A, A]
const both = Traversal.make<[number, number], number>(
  (f) => ([a, b]) => [f(a), f(b)],
  ([a, b]) => [a, b],
);

both.toArray([10, 20]);            // => [10, 20]
both.modify(n => n + 1)([10, 20]); // => [11, 21]
```

### Traversal personalizado: hojas de un árbol binario

```ts
type Tree<A> =
  | { kind: "leaf"; value: A }
  | { kind: "node"; left: Tree<A>; right: Tree<A> };

const leaves = <A>(): Traversal<Tree<A>, A> =>
  Traversal.make(
    (f) => {
      const go = (t: Tree<A>): Tree<A> => {
        if (t.kind === "leaf") return leaf(f(t.value));
        return node(go(t.left), go(t.right));
      };
      return go;
    },
    (s) => {
      const result: A[] = [];
      const go = (t: Tree<A>): void => {
        if (t.kind === "leaf") result.push(t.value);
        else { go(t.left); go(t.right); }
      };
      go(s);
      return result;
    },
  );

//       node
//      /    \
//   leaf(1)  node
//           /    \
//        leaf(2)  leaf(3)
const tree = node(leaf(1), node(leaf(2), leaf(3)));

leaves<number>().toArray(tree);
// => [1, 2, 3]

leaves<number>().modify(n => n * 10)(tree);
// => node(leaf(10), node(leaf(20), leaf(30)))
// La estructura del árbol se preserva
```

## Constructores

### `each<A>(): Traversal<A[], A>`

Traversal sobre **todos los elementos** de un array. Es el más básico.

```ts
const t = Traversal.each<number>();

t.toArray([1, 2, 3]);           // => [1, 2, 3]
t.toArray([]);                   // => []
t.modify(n => n * 10)([1, 2, 3]); // => [10, 20, 30]
```

Internamente, `modify` usa `Array.map` y `toArray` devuelve el array tal cual (un array ya ES su propia lista de focos).

### `eachValue<A>(): Traversal<Record<string, A>, A>`

Traversal sobre **todos los valores** de un `Record`, preservando las claves.

```ts
const t = Traversal.eachValue<number>();

t.toArray({ a: 1, b: 2, c: 3 });           // => [1, 2, 3] (orden puede variar)
t.toArray({});                               // => []
t.modify(n => n * 10)({ x: 1, y: 2 });     // => { x: 10, y: 20 }
```

### `filtered<A>(pred): Traversal<A[], A>`

Traversal que solo enfoca los elementos que cumplen un predicado.

```ts
const evens = Traversal.filtered<number>(n => n % 2 === 0);

evens.toArray([1, 2, 3, 4, 5]);   // => [2, 4]
evens.toArray([1, 3, 5]);          // => []

// modify solo afecta los que cumplen el predicado:
evens.modify(n => n * 10)([1, 2, 3, 4, 5]);
// => [1, 20, 3, 40, 5]
// Los impares quedan intactos
```

### `make(modify, toArray): Traversal<S, A>`

Constructor genérico para cuando los constructores predefinidos no sirven. Tú eres responsable de que las leyes se cumplan.

```ts
const leaves = Traversal.make(modifyFn, collectFn);
```

## Operaciones (el Traversal fluye por el pipe)

Las operaciones reciben el **dato** como argumento y el **Traversal** fluye por el pipe:

### `collect(s)(t): A[]` — recolectar todos los focos

```ts
pipe(Traversal.each<number>(), Traversal.collect([1, 2, 3]));
// => [1, 2, 3]
```

### `modify(f)(t): (s: S) => S` — modificar cada foco

```ts
pipe(Traversal.each<number>(), Traversal.modify(n => n + 10))([1, 2, 3]);
// => [11, 12, 13]
```

### `set(a)(t): (s: S) => S` — reemplazar cada foco con un valor constante

```ts
pipe(Traversal.each<number>(), Traversal.set(0))([1, 2, 3]);
// => [0, 0, 0]
```

### `fold(init, f)(t): (s: S) => B` — reducir todos los focos

```ts
pipe(Traversal.each<number>(), Traversal.fold(0, (acc, n) => acc + n))([1, 2, 3, 4]);
// => 10

// Sobre un array vacío, devuelve el valor inicial:
pipe(Traversal.each<number>(), Traversal.fold(0, (acc, n) => acc + n))([]);
// => 0
```

## Composición

### `compose(to)(from): Traversal`

La función `compose` del módulo Traversal es pipe-friendly. Como Traversal es el tipo más débil, cualquier composición siempre resulta en un Traversal:

- Traversal + Traversal = Traversal
- Traversal + Lens = Traversal
- Traversal + Prism = Traversal

```ts
// Traversal + Traversal
// Cada número dentro de un array de arrays (number[][])
const outer = Traversal.each<number[]>();
const inner = Traversal.each<number>();
const deepEach = pipe(outer, Traversal.compose(inner));

const nested = [[1, 2], [3, 4, 5], [6]];

pipe(deepEach, Traversal.collect(nested));
// => [1, 2, 3, 4, 5, 6]  — aplanado

pipe(deepEach, Traversal.modify(n => n * 10))(nested);
// => [[10, 20], [30, 40, 50], [60]]  — estructura preservada
```

### Composición con arrays vacíos

```ts
pipe(deepEach, Traversal.collect([]));             // => []
pipe(deepEach, Traversal.collect([[], [], []]));   // => [] (todos los internos vacíos)
```

### Composición más compleja: records dentro de arrays

```ts
const outer = Traversal.each<Record<string, number>>();
const inner = Traversal.eachValue<number>();
const composed = pipe(outer, Traversal.compose(inner));

const data = [{ a: 1, b: 2 }, { c: 3 }];

pipe(composed, Traversal.collect(data));              // => [1, 2, 3]
pipe(composed, Traversal.modify(n => n * 100))(data); // => [{ a: 100, b: 200 }, { c: 300 }]
```

### Las leyes se preservan

```ts
// Identity
pipe(composed, Traversal.modify(x => x))(data);  // => data

// Composition
const f = (n: number) => n + 10;
const g = (n: number) => n * 3;
pipe(composed, Traversal.modify(f))(pipe(composed, Traversal.modify(g))(data));
// === pipe(composed, Traversal.modify(x => f(g(x))))(data)
```

## Cómo funciona internamente

La composición de Traversals (caso Traversal + Traversal) es elegante:

```ts
// Dentro de compose, cuando to.tag === 'Traversal':
{
  tag: 'Traversal',
  // modify: para cada A, modifica todos los B's dentro
  modify: (f) => from.modify(inner.modify(f)),

  // toArray: recolecta todos los B's de todos los A's
  toArray: (s) => {
    const result: B[] = [];
    for (const a of from.toArray(s)) {
      for (const b of inner.toArray(a)) {
        result.push(b);
      }
    }
    return result;
  },
}
```

`modify` se compone directamente: aplicar el modify interno dentro del modify externo. Sin arrays intermedios para el camino de escritura.

## Resumen

| Concepto          | Descripción                                               |
|-------------------|-----------------------------------------------------------|
| **Tipo**          | `Traversal<S, A>` con `tag`, `modify` y `toArray`        |
| **Focos**         | 0 a N — puede estar vacío, tener uno o muchos             |
| **Leyes**         | Identity, Composition                                      |
| **Constructores** | Manual, `make`, `each`, `eachValue`, `filtered`            |
| **Operaciones**   | `collect`, `modify`, `set`, `fold`                        |
| **Composición**   | `compose` (pipe-friendly, overloaded por tag)              |
| **Uso típico**    | Arrays, records, árboles, cualquier estructura con múltiples elementos |

---

**Anterior:** [Prism](./04-prism.md) — Enfoque parcial
**Siguiente:** [Composición](./06-composicion.md) — Combinar diferentes tipos de optics
