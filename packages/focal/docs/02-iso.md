# Iso — Isomorfismos

> **Archivo fuente:** `lib/iso.ts`
> **Tests:** `tests/iso/`

## ¿Qué es un Iso?

Un **Iso** (abreviatura de isomorfismo) representa una **conversión total y reversible** entre dos tipos `A` y `B`. Ni la ida ni la vuelta pierden información: los dos tipos contienen exactamente la misma información, solo que representada de forma diferente.

### Analogía

Piensa en una conversión de temperatura: **Celsius ↔ Fahrenheit**. Cualquier temperatura en Celsius tiene un equivalente exacto en Fahrenheit, y viceversa. No se pierde nada en ninguna dirección.

Otros ejemplos naturales:
- `string ↔ char[]` (split/join)
- `{ fst: A, snd: B } ↔ [A, B]` (record ↔ tupla)
- `A ↔ A` (identidad)

## Interfaz

```ts
interface Iso<A, B> {
  readonly tag: 'Iso';
  readonly to:   (a: A) => B;  // dirección "ida"
  readonly from: (b: B) => A;  // dirección "vuelta"
}
```

El campo `tag` es un discriminante literal que identifica el tipo de optic. Se usa internamente para la composición cruzada (la función `compose` lo inspecciona en runtime).

## Leyes

Un Iso debe satisfacer dos leyes de **viaje redondo** (roundtrip):

### RoundTrip1: `from(to(a)) ≡ a`

Ir de A a B y volver a A te deja donde empezaste.

```ts
const celsiusToFahrenheit: Iso<number, number> = {
  tag: 'Iso',
  to:   (c) => c * 9 / 5 + 32,
  from: (f) => (f - 32) * 5 / 9,
};

// Ley 1: from(to(a)) ≡ a
celsiusToFahrenheit.from(celsiusToFahrenheit.to(100)); // => 100
```

### RoundTrip2: `to(from(b)) ≡ b`

Ir de B a A y volver a B también te deja donde empezaste.

```ts
// Ley 2: to(from(b)) ≡ b
celsiusToFahrenheit.to(celsiusToFahrenheit.from(212)); // => 212
```

Si alguna de estas leyes falla, la conversión no es un verdadero isomorfismo — algo se pierde en el camino.

## Crear un Iso manualmente

Un Iso es un objeto plano con `tag`, `to` y `from`. Puedes construirlo manualmente o usando `Iso.make`:

```ts
// Celsius ↔ Fahrenheit
const celsiusToFahrenheit: Iso<number, number> = {
  tag: 'Iso',
  to:   (c) => c * 9 / 5 + 32,
  from: (f) => (f - 32) * 5 / 9,
};

celsiusToFahrenheit.to(0);    // => 32
celsiusToFahrenheit.to(100);  // => 212
celsiusToFahrenheit.from(32); // => 0

// string ↔ char[]
const stringToChars: Iso<string, string[]> = {
  tag: 'Iso',
  to:   (s) => s.split(""),
  from: (chars) => chars.join(""),
};

stringToChars.to("hello");        // => ["h", "e", "l", "l", "o"]
stringToChars.from(["h", "i"]);   // => "hi"

// Record ↔ Tupla
interface Pair { fst: number; snd: string }

const pairToTuple: Iso<Pair, [number, string]> = {
  tag: 'Iso',
  to:   (p) => [p.fst, p.snd],
  from: ([fst, snd]) => ({ fst, snd }),
};
```

## Constructores

### `make<A, B>(to, from): Iso<A, B>`

Crea un Iso a partir de un par de funciones de conversión. Equivale a construir el objeto manualmente, pero más conciso:

```ts
const celsiusToFahrenheit = Iso.make(
  (c: number) => c * 9 / 5 + 32,
  (f: number) => (f - 32) * 5 / 9,
);

celsiusToFahrenheit.to(0);    // => 32
celsiusToFahrenheit.from(32); // => 0
```

### `identity<A>(): Iso<A, A>`

El Iso identidad — ambas direcciones son la función identidad.

```ts
const id = Iso.identity<number>();
id.to(42);   // => 42
id.from(42); // => 42
```

### `reverse(iso: Iso<A, B>): Iso<B, A>`

Invierte un Iso: intercambia `to` y `from`. Pipe-friendly: el Iso fluye por el pipe.

```ts
const fahrenheitToCelsius = pipe(celsiusToFahrenheit, Iso.reverse);

fahrenheitToCelsius.to(212);  // => 100  (antes era `from`)
fahrenheitToCelsius.from(100); // => 212  (antes era `to`)
```

Invertir dos veces te da el Iso original:

```ts
const backAgain = pipe(celsiusToFahrenheit, Iso.reverse, Iso.reverse);
backAgain.to(100); // => 212, igual que el original
```

## Operaciones (el Iso fluye por el pipe)

En `@oofp/focal`, las operaciones reciben el **dato** como argumento y el **optic** fluye por el pipe:

### `view(a)(iso): B` — dirección ida

```ts
pipe(celsiusToFahrenheit, Iso.view(100)); // => 212
```

### `review(b)(iso): A` — dirección vuelta

```ts
pipe(celsiusToFahrenheit, Iso.review(212)); // => 100
```

### `over(f)(iso): (a: A) => A` — modificar en el espacio B, retornar en A

Convierte a B, aplica `f`, y convierte de vuelta a A. Retorna una función `A => A`:

```ts
// "Duplicar la temperatura en Fahrenheit" partiendo de Celsius
pipe(celsiusToFahrenheit, Iso.over(f => f * 2))(100);
// 100°C → 212°F → 424°F → ≈ 217.78°C

// Convertir a mayúsculas pasando por chars
pipe(stringToChars, Iso.over(chars => chars.map(c => c.toUpperCase())))("hello");
// => "HELLO"
```

Con la función identidad, `over` no cambia nada:

```ts
pipe(stringToChars, Iso.over(chars => chars))("hello");
// => "hello"
```

## Conversión a optics más débiles

Como el Iso es el optic más fuerte, puede convertirse a cualquier otro. Estas funciones también son pipe-friendly:

### `toLens(iso): Lens<A, B>`

```ts
const lens = pipe(pairToTuple, Iso.toLens);

lens.get({ fst: 1, snd: "x" });          // => [1, "x"]
lens.set([2, "y"])({ fst: 1, snd: "x" }); // => { fst: 2, snd: "y" }
```

El Lens resultante cumple las tres leyes de Lens:
- **GetPut:** `set(get(s))(s) ≡ s`
- **PutGet:** `get(set(a)(s)) ≡ a`
- **PutPut:** `set(b)(set(a)(s)) ≡ set(b)(s)`

### `toPrism(iso): Prism<A, B>`

```ts
const prism = pipe(stringToChars, Iso.toPrism);

prism.preview("hello"); // => Just(["h", "e", "l", "l", "o"])  — siempre es Just
prism.review(["h", "i"]); // => "hi"
```

El preview de un Iso convertido a Prism **siempre** devuelve `Just`, porque el Iso nunca falla.

## Composición

Cada módulo tiene su propia función `compose` que es pipe-friendly y usa overloads para manejar composición cruzada. El Iso fluye por el pipe y el optic destino es el argumento de `compose`:

### `compose(to)(from): Optic`

El tipo del resultado depende del `tag` del optic destino:

- Iso + Iso = Iso
- Iso + Lens = Lens
- Iso + Prism = Prism
- Iso + Traversal = Traversal

```ts
// Iso + Iso = Iso
// Celsius → Fahrenheit → Rankine
const fahrenheitToRankine: Iso<number, number> = {
  tag: 'Iso',
  to:   (f) => f + 459.67,
  from: (r) => r - 459.67,
};

const celsiusToRankine = pipe(celsiusToFahrenheit, Iso.compose(fahrenheitToRankine));

celsiusToRankine.to(0);       // => 491.67  (0°C = 32°F = 491.67°R)
celsiusToRankine.from(491.67); // => 0
```

### La composición es asociativa

```ts
const double: Iso<number, number>  = { tag: 'Iso', to: n => n * 2,  from: n => n / 2  };
const addTen: Iso<number, number>  = { tag: 'Iso', to: n => n + 10, from: n => n - 10 };
const negate: Iso<number, number>  = { tag: 'Iso', to: n => -n,     from: n => -n     };

// Estas dos agrupaciones producen el mismo resultado:
const leftAssoc  = pipe(double, Iso.compose(addTen), Iso.compose(negate));
const rightAssoc = pipe(double, Iso.compose(pipe(addTen, Iso.compose(negate))));

leftAssoc.to(5);  // === rightAssoc.to(5)
leftAssoc.from(5); // === rightAssoc.from(5)
```

## Resumen

| Concepto          | Descripción                                           |
|-------------------|-------------------------------------------------------|
| **Tipo**          | `Iso<A, B>` con `tag`, `to` y `from`                |
| **Focos**         | Exactamente 1, siempre presente                       |
| **Leyes**         | RoundTrip1, RoundTrip2                                |
| **Constructores** | `make(to, from)`, `identity()`, `reverse()`          |
| **Operaciones**   | `view`, `review`, `over`                              |
| **Composición**   | `compose` (pipe-friendly, overloaded por tag)         |
| **Se convierte a**| `toLens`, `toPrism`                                   |
| **Uso típico**    | Conversiones reversibles entre representaciones        |

---

**Siguiente:** [Lens](./03-lens.md) — El optic más utilizado, para acceder a propiedades.
