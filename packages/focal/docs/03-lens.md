# Lens — Enfoque total sobre una parte

> **Archivo fuente:** `lib/lens.ts`
> **Tests:** `tests/lens/`

## ¿Qué es un Lens?

Un **Lens** enfoca **exactamente una parte** `A` dentro de un todo `S`, y esa parte **siempre existe**. Es el optic más común y práctico: piensa en él como un getter y setter inmutables empaquetados juntos.

### Analogía

Un Lens es como una lupa que siempre apunta a un campo específico de un objeto. No importa qué valor tenga el objeto — el campo siempre está ahí, y puedes leerlo o reemplazarlo.

## Interfaz

```ts
interface Lens<S, A> {
  readonly tag: 'Lens';
  readonly get: (s: S) => A;              // extraer el foco del todo
  readonly set: (a: A) => (s: S) => S;    // reemplazar el foco en el todo
}
```

El campo `tag` es un discriminante literal usado internamente para la composición cruzada.

Nota que `set` es curificado: primero recibes el nuevo valor, luego el todo. Esto lo hace compatible con `pipe`.

## Leyes

Un Lens legítimo debe cumplir **tres leyes**. Si un Lens rompe alguna, la composición y el razonamiento se quiebran.

### GetPut: `set(get(s))(s) ≡ s`

Si extraes un valor y lo vuelves a poner, nada cambia.

```ts
const nameLens = pipe(Lens.identity<Person>(), Lens.prop("name"));

// Extraer "Alice" y volver a ponerla = sin cambios
nameLens.set(nameLens.get(alice))(alice);
// => { name: "Alice", age: 30, address: {...} }  (igual a alice)
```

### PutGet: `get(set(a)(s)) ≡ a`

Si pones un valor y luego lo extraes, obtienes lo que pusiste.

```ts
nameLens.get(nameLens.set("Bob")(alice));
// => "Bob"
```

### PutPut: `set(b)(set(a)(s)) ≡ set(b)(s)`

Poner dos veces es lo mismo que poner una vez con el último valor. El primer `set` no tiene efecto.

```ts
nameLens.set("Charlie")(nameLens.set("Bob")(alice));
// === nameLens.set("Charlie")(alice)
```

## Crear un Lens manualmente

Un Lens es un objeto plano con `tag`, `get` y `set`. Puedes construirlo manualmente o usando `Lens.make`:

```ts
const xLens: Lens<{ x: number; y: number }, number> = {
  tag: 'Lens',
  get: (point) => point.x,
  set: (x) => (point) => ({ ...point, x }),
};

xLens.get({ x: 1, y: 2 });       // => 1
xLens.set(10)({ x: 1, y: 2 });   // => { x: 10, y: 2 }
```

Nota que `set` **no muta** el objeto original — crea uno nuevo con spread (`...`).

## Constructores

### `make<S, A>(get, set): Lens<S, A>`

Crea un Lens a partir de un getter y un setter. Equivale a construir el objeto manualmente, pero más conciso:

```ts
const fstLens = Lens.make(
  (pair: [number, string]) => pair[0],
  (n: number) => (pair: [number, string]) => [n, pair[1]] as [number, string],
);

fstLens.get([1, "hello"]);       // => 1
fstLens.set(10)([1, "hello"]);   // => [10, "hello"]
```

Nota que `set` sigue siendo curificado: `(a: A) => (s: S) => S`.

### `identity<A>(): Lens<A, A>`

El Lens identidad — enfoca el valor completo. Sirve como punto de entrada para cadenas de `pipe` con `prop`:

```ts
const ageLens = pipe(Lens.identity<Person>(), Lens.prop("age"));
```

### `prop(key)` — Combinador pipe-friendly

`prop` es un **combinador** que recibe una clave y un Lens, y retorna un nuevo Lens enfocado en esa propiedad. Todos los tipos se infieren automáticamente:

```ts
const prop: <A, K extends keyof A>(key: K) => <S>(lens: Lens<S, A>) => Lens<S, A[K]>
```

Se usa en cadenas de `pipe` para penetrar en objetos anidados:

```ts
const streetLens = pipe(
  Lens.identity<Company>(),
  Lens.prop("ceo"),
  Lens.prop("address"),
  Lens.prop("street"),
);
// Tipo inferido: Lens<Company, string>
```

Cada `prop` compone automáticamente con el Lens que llega por el pipe, creando un nuevo Lens más profundo. No necesitas especificar ningún tipo — TypeScript los infiere todos de la cadena.

## Operaciones (el Lens fluye por el pipe)

Las operaciones reciben el **dato** como argumento y el **Lens** fluye por el pipe:

### `view(s)(lens): A` — extraer el foco

```ts
pipe(Lens.identity<Person>(), Lens.prop("age"), Lens.view(alice));
// => 30
```

### `set(a)(lens): (s: S) => S` — reemplazar el foco

Retorna una función `S => S`:

```ts
pipe(Lens.identity<Company>(), Lens.prop("ceo"), Lens.prop("age"), Lens.set(31))(acme);
// => { ...acme, ceo: { ...acme.ceo, age: 31 } }
```

### `over(f)(lens): (s: S) => S` — modificar el foco con una función

```ts
pipe(Lens.identity<Company>(), Lens.prop("ceo"), Lens.prop("age"), Lens.over(n => n + 1))(acme);
// => { ...acme, ceo: { ...acme.ceo, age: 31 } }
```

`over` con la función identidad no cambia nada (esto es una consecuencia de las leyes):

```ts
pipe(ageLens, Lens.over(n => n))(alice);
// => alice (sin cambios)
```

## Composición

### `compose(to)(from): Optic`

La función `compose` del módulo Lens es pipe-friendly y usa overloads para manejar composición cruzada. El Lens fluye por el pipe y el optic destino es el argumento:

- Lens + Lens = Lens
- Lens + Prism = Prism
- Lens + Traversal = Traversal

```ts
const addressLens = pipe(Lens.identity<Person>(), Lens.prop("address"));
const streetLens = pipe(Lens.identity<Address>(), Lens.prop("street"));

// Lens<Person, Address> + Lens<Address, string> = Lens<Person, string>
const personStreetLens = pipe(addressLens, Lens.compose(streetLens));

personStreetLens.get(alice);
// => "123 Main St"

personStreetLens.set("456 Oak Ave")(alice);
// => { ..., address: { street: "456 Oak Ave", city: "Springfield", zip: "62704" } }
```

Nota: en la práctica, usar `prop` encadenado con `pipe` es más idiomático que `compose` para Lens + Lens:

```ts
// Más idiomático:
const personStreetLens = pipe(
  Lens.identity<Person>(),
  Lens.prop("address"),
  Lens.prop("street"),
);
```

`compose` es más útil para composición cruzada (Lens + Prism, Lens + Traversal).

### Composición con `identity`

Componer con el Lens identidad no cambia nada (es el elemento neutro):

```ts
const ageLens = pipe(Lens.identity<Person>(), Lens.prop("age"));

// identity ∘ ageLens ≡ ageLens
pipe(Lens.identity<Person>(), Lens.compose(ageLens), Lens.view(alice));
// => 30 (igual que usar ageLens directamente)
```

## El Lens compuesto también cumple las leyes

Un punto importante: si compones dos Lenses legales, el resultado también es legal. Las tres leyes se preservan:

```ts
const personStreetLens = pipe(
  Lens.identity<Person>(),
  Lens.prop("address"),
  Lens.prop("street"),
);

// GetPut
personStreetLens.set(personStreetLens.get(alice))(alice);
// => alice (sin cambios)

// PutGet
personStreetLens.get(personStreetLens.set("789 Elm Rd")(alice));
// => "789 Elm Rd"

// PutPut
personStreetLens.set("B")(personStreetLens.set("A")(alice));
// === personStreetLens.set("B")(alice)
```

## Cómo funciona internamente

La implementación de `prop` compone inline con el Lens que recibe:

```ts
const prop =
  <A, K extends keyof A>(key: K) =>
  <S>(lens: Lens<S, A>): Lens<S, A[K]> => ({
    tag: 'Lens',
    get: (s) => lens.get(s)[key],
    set: (v) => (s) => {
      const a = lens.get(s);
      return lens.set({ ...a, [key]: v })(s);
    },
  });
```

Y la implementación de `over` (modificar con función):

```ts
const over =
  <A>(f: (a: A) => A) =>
  <S>(lens: Lens<S, A>) =>
  (s: S): S =>
    lens.set(f(lens.get(s)))(s);  // get → aplicar f → set
```

## Resumen

| Concepto          | Descripción                                           |
|-------------------|-------------------------------------------------------|
| **Tipo**          | `Lens<S, A>` con `tag`, `get` y `set`                |
| **Focos**         | Exactamente 1, siempre presente                       |
| **Leyes**         | GetPut, PutGet, PutPut                                |
| **Constructores** | `make(get, set)`, `identity()`, `prop(key)` (combinador) |
| **Operaciones**   | `view`, `set`, `over`                                 |
| **Composición**   | `compose` (pipe-friendly, overloaded por tag)          |
| **Uso típico**    | Acceder/modificar propiedades de objetos anidados      |

---

**Anterior:** [Iso](./02-iso.md) — Conversiones reversibles
**Siguiente:** [Prism](./04-prism.md) — Cuando el foco podría no existir
