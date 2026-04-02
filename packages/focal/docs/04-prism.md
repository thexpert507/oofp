# Prism — Enfoque parcial

> **Archivo fuente:** `lib/prism.ts`
> **Tests:** `tests/prism/`

## ¿Qué es un Prism?

Un **Prism** enfoca una parte `A` dentro de un todo `S` que **podría no existir**. Si un Lens dice "el campo siempre está ahí", un Prism dice "el campo podría estar o no".

### Analogía

Piensa en un Prism como un **pattern matching que también puede reconstruir**:
- `preview`: intenta extraer un valor (puede fallar → `Nothing`)
- `review`: construye el todo a partir del foco

Es como verificar "¿es este `Maybe` un `Just`?" y, si lo es, acceder al valor interno.

### Ejemplos naturales de Prisms

- `Maybe<A> → A` — el valor podría ser `Nothing`
- `Either<E, A> → A` — podría ser `Left`
- `A[] → A` en un índice — el índice podría estar fuera de rango
- Uniones discriminadas → una variante específica — podría ser otra variante

## Interfaz

```ts
interface Prism<S, A> {
  readonly tag: 'Prism';
  readonly preview: (s: S) => Maybe<A>;    // intentar extraer (puede fallar)
  readonly review:  (a: A) => S;           // construir S desde A
  readonly modify?: (f: (a: A) => A) => (s: S) => S;  // override opcional
}
```

El campo `tag` es un discriminante literal usado internamente para la composición cruzada.

### ¿Por qué `modify` es opcional?

Por defecto, modificar un Prism funciona así: `preview → f → review`. Pero para algunos Prisms (como el de índice de array), `review` no puede reconstruir todo el contexto original (solo crea un array mínimo con ese índice). El campo `modify` permite un override que preserva el contexto original.

## Leyes

### PreviewReview: `preview(review(a)) ≡ Just(a)`

Si construyes un todo desde un foco, al extraer obtienes el foco original.

```ts
const justPrism = Prism._just<number>();

justPrism.preview(justPrism.review(42));
// review(42) => Just(42)
// preview(Just(42)) => Just(42) ✓
```

### ReviewPreview: si `preview(s) = Just(a)`, entonces `review(a) ≡ s`

Si la extracción tiene éxito, reconstruir desde el resultado te da el original.

```ts
const s = M.just(42);
const previewed = justPrism.preview(s); // => Just(42)
// Como preview tuvo éxito:
justPrism.review(42); // => Just(42) === s ✓
```

Nota: ReviewPreview solo aplica cuando `preview` tiene éxito. Si devuelve `Nothing`, la ley no se aplica.

## Crear un Prism manualmente

Puedes construir un Prism manualmente o usando `Prism.make`:

```ts
// Prism para parsear/imprimir enteros desde strings
const intPrism: Prism<string, number> = {
  tag: 'Prism',
  preview: (s) => {
    const n = Number.parseInt(s, 10);
    return Number.isNaN(n) ? M.nothing() : M.just(n);
  },
  review: (n) => String(n),
};

intPrism.preview("42");      // => Just(42)
intPrism.preview("hello");   // => Nothing
intPrism.review(42);         // => "42"

// Ley PreviewReview:
intPrism.preview(intPrism.review(99)); // => Just(99) ✓
```

## Constructores

### `make<S, A>(preview, review): Prism<S, A>`

Crea un Prism a partir de una función `preview` y una función `review`. Equivale a construir el objeto manualmente, pero más conciso:

```ts
const intPrism = Prism.make(
  (s: string) => {
    const n = parseInt(s, 10);
    return isNaN(n) ? M.nothing() : M.just(n);
  },
  (n: number) => String(n),
);

intPrism.preview("42");    // => Just(42)
intPrism.preview("hello"); // => Nothing
intPrism.review(42);       // => "42"
```

### `_just<A>(): Prism<Maybe<A>, A>`

Enfoca el caso `Just` de un `Maybe`:

```ts
const p = Prism._just<string>();

pipe(p, Prism.preview(M.just("hello"))); // => Just("hello")
pipe(p, Prism.preview(M.nothing()));     // => Nothing
pipe(p, Prism.review("hello"));           // => Just("hello")
```

### `_nothing<A>(): Prism<Maybe<A>, void>`

Enfoca el caso `Nothing`. El tipo del foco es `void` porque `Nothing` no lleva valor.

```ts
const p = Prism._nothing<string>();

pipe(p, Prism.preview(M.nothing()));      // => Just(undefined)
pipe(p, Prism.preview(M.just("hello")));  // => Nothing
pipe(p, Prism.review(undefined));          // => Nothing
```

### `_right<L, A>(): Prism<Either<L, A>, A>`

Enfoca el caso `Right` de un `Either`:

```ts
const p = Prism._right<string, number>();

pipe(p, Prism.preview(E.right(42)));      // => Just(42)
pipe(p, Prism.preview(E.left("error")));  // => Nothing
pipe(p, Prism.review(42));                 // => Right(42)
```

### `_left<L, A>(): Prism<Either<L, A>, L>`

Enfoca el caso `Left`:

```ts
const p = Prism._left<string, number>();

pipe(p, Prism.preview(E.left("error")));  // => Just("error")
pipe(p, Prism.preview(E.right(42)));      // => Nothing
pipe(p, Prism.review("error"));            // => Left("error")
```

### `index<A>(i: number): Prism<A[], A>`

Enfoca un elemento de un array por índice. Devuelve `Nothing` si el índice está fuera de rango.

```ts
const second = Prism.index<number>(1);

pipe(second, Prism.preview([10, 20, 30])); // => Just(20)
pipe(second, Prism.preview([10]));          // => Nothing (fuera de rango)
pipe(second, Prism.preview([]));            // => Nothing
```

Este Prism incluye un override de `modify` para preservar los demás elementos del array:

```ts
// Sin el override, modify haría: preview → f → review, perdiendo los demás elementos.
// Con el override:
pipe(second, Prism.over(n => n * 10))([10, 20, 30]);
// => [10, 200, 30]  — solo el elemento en index 1 cambió
```

### `indexRecord<V>(key: string): Prism<Record<string, V>, V>`

Enfoca el valor asociado a la clave `key` en un `Record<string, V>`. Devuelve `Nothing` si la clave no existe en el record.

```ts
const atFoo = Prism.indexRecord<number>("foo");

pipe(atFoo, Prism.preview({ foo: 42, bar: 7 })); // => Just(42)
pipe(atFoo, Prism.preview({ bar: 7 }));           // => Nothing (clave ausente)
pipe(atFoo, Prism.preview({}));                   // => Nothing
pipe(atFoo, Prism.review(99));                    // => { foo: 99 }
```

Al igual que `index`, este Prism incluye un override de `modify` para preservar el resto del record — sin el override, `review(f(preview(s)))` devolvería un record de una sola entrada descartando todas las demás claves:

```ts
const double = atFoo.modify!(n => n * 2);

double({ foo: 5, bar: 3 });  // => { foo: 10, bar: 3 }  — solo "foo" cambió
double({ bar: 3 });           // => { bar: 3 }  — no-op, clave ausente
```

### `match<S>()(tagKey, tagValue): Prism<S, Variant>` (forma identidad)

Crea un Prism para una variante específica de una **unión discriminada**. El foco es la variante completa (narrowed):

```ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

const _circle = Prism.match<Shape>()("kind", "circle");
// Prism<Shape, { kind: "circle"; radius: number }>

pipe(_circle, Prism.preview({ kind: "circle", radius: 5 }));
// => Just({ kind: "circle", radius: 5 })

pipe(_circle, Prism.preview({ kind: "rect", width: 3, height: 4 }));
// => Nothing

pipe(_circle, Prism.review({ kind: "circle", radius: 10 }));
// => { kind: "circle", radius: 10 }
```

Nota la firma de doble llamada: `match<S>()(tagKey, tagValue)`. El tipo de unión `S` se fija explícitamente, y TypeScript infiere los demás tipos del tag key y value.

### `matchWith<S>()(tagKey, tagValue, get, build): Prism<S, A>` (con transformación)

Similar a `match`, pero permite transformar el foco con funciones `get` y `build` personalizadas:

```ts
const _circleRadius = Prism.matchWith<Shape>()(
  "kind", "circle",
  (s) => s.radius,                          // extraer el foco
  (r) => ({ kind: "circle", radius: r }),    // construir la variante
);
// Prism<Shape, number>

pipe(_circleRadius, Prism.preview({ kind: "circle", radius: 5 }));
// => Just(5)

pipe(_circleRadius, Prism.review(10));
// => { kind: "circle", radius: 10 }
```

## Operaciones (el Prism fluye por el pipe)

Las operaciones reciben el **dato** como argumento y el **Prism** fluye por el pipe:

### `preview(s)(prism): Maybe<A>` — intentar extraer

```ts
pipe(Prism._just<number>(), Prism.preview(M.just(42)));   // => Just(42)
pipe(Prism._just<number>(), Prism.preview(M.nothing()));  // => Nothing
```

### `review(a)(prism): S` — construir

```ts
pipe(Prism._just<number>(), Prism.review(42)); // => Just(42)
```

### `over(f)(prism): (s: S) => S` — modificar si está presente

Si el foco existe, aplica `f`. Si no, devuelve `s` sin cambios. Usa el override de `modify` cuando está disponible.

```ts
pipe(Prism._just<number>(), Prism.over(n => n * 2))(M.just(10));   // => Just(20)
pipe(Prism._just<number>(), Prism.over(n => n * 2))(M.nothing());  // => Nothing (sin cambios)
```

### `set(a)(prism): (s: S) => S` — reemplazar si está presente

```ts
pipe(Prism._just<number>(), Prism.set(99))(M.just(10));   // => Just(99)
pipe(Prism._just<number>(), Prism.set(99))(M.nothing());  // => Nothing (sin cambios)
```

## Composición

### `compose(to)(from): Optic`

La función `compose` del módulo Prism es pipe-friendly y maneja composición cruzada:

- Prism + Prism = Prism
- Prism + Lens = Prism
- Prism + Traversal = Traversal

```ts
// Prism + Prism = Prism
// Maybe<Either<string, number>> → Either<string, number> → number
const outerPrism = Prism._just<Either<string, number>>();
const innerPrism = Prism._right<string, number>();
const composed = pipe(outerPrism, Prism.compose(innerPrism));

// Ambos coinciden:
pipe(composed, Prism.preview(M.just(E.right(42))));    // => Just(42)

// El externo falla:
pipe(composed, Prism.preview(M.nothing()));            // => Nothing

// El interno falla:
pipe(composed, Prism.preview(M.just(E.left("err"))));  // => Nothing

// review construye de adentro hacia afuera:
pipe(composed, Prism.review(42));  // => Just(Right(42))
```

### El helper `prismModify`

El módulo exporta `prismModify`, un helper que deriva `modify` de un Prism respetando el override cuando existe:

```ts
const prismModify = <S, A>(prism: Prism<S, A>) =>
  prism.modify ??
  ((f: (a: A) => A) => (s: S): S => {
    const ma = prism.preview(s);
    if (M.isNothing(ma)) return s;
    return prism.review(f(ma.value));
  });
```

Esto es usado internamente por la composición de otros módulos (Lens, Traversal) cuando componen con Prisms.

### Las leyes se preservan en la composición

```ts
// Maybe<Maybe<number>> → Maybe<number> → number
const outer = Prism._just<Maybe<number>>();
const inner = Prism._just<number>();
const composed = pipe(outer, Prism.compose(inner));

// PreviewReview:
pipe(composed, Prism.preview(pipe(composed, Prism.review(7))));
// => Just(7) ✓
```

## Resumen

| Concepto          | Descripción                                             |
|-------------------|---------------------------------------------------------|
| **Tipo**          | `Prism<S, A>` con `tag`, `preview`, `review`, `modify?` |
| **Focos**         | 0 o 1 — puede estar ausente                            |
| **Leyes**         | PreviewReview, ReviewPreview                            |
| **Constructores** | `make(preview, review)`, `_just`, `_nothing`, `_right`, `_left`, `index`, `indexRecord`, `match`, `matchWith` |
| **Operaciones**   | `preview`, `review`, `over`, `set`                      |
| **Composición**   | `compose` (pipe-friendly, overloaded por tag)            |
| **Helper**        | `prismModify` (exportado, usado por otros módulos)       |
| **Uso típico**    | Maybe, Either, índices de array, variantes de uniones   |

---

**Anterior:** [Lens](./03-lens.md) — Enfoque total sobre una parte
**Siguiente:** [Traversal](./05-traversal.md) — Múltiples focos
