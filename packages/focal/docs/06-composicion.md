# Composición entre tipos de optics

> **La composición vive en cada módulo** — no hay un archivo `compose.ts` separado.
> Cada módulo (`iso.ts`, `lens.ts`, `prism.ts`, `traversal.ts`) exporta su propia función `compose`.

## La idea central

Cada módulo de optic tiene una función `compose` que acepta optics de **diferentes tipos** como argumento. La función usa el campo `tag` del optic destino para determinar el tipo del resultado en runtime, con overloads de TypeScript para proveer tipos seguros en compile-time.

La regla es simple: **el resultado es siempre el tipo más débil de los dos**.

```
Iso > Lens > Prism > Traversal
(más fuerte → más débil)
```

Esto es lógico: si alguna parte de la cadena puede fallar (Prism) o tener múltiples focos (Traversal), el resultado hereda esa limitación. No puedes prometer más de lo que el eslabón más débil garantiza.

## Tabla de composición completa

| Externo    | Interno    | Resultado     | Se usa                     |
|------------|------------|---------------|----------------------------|
| Iso        | Iso        | **Iso**       | `Iso.compose(inner)`       |
| Iso        | Lens       | **Lens**      | `Iso.compose(inner)`       |
| Iso        | Prism      | **Prism**     | `Iso.compose(inner)`       |
| Iso        | Traversal  | **Traversal** | `Iso.compose(inner)`       |
| Lens       | Lens       | **Lens**      | `Lens.compose(inner)`      |
| Lens       | Prism      | **Prism**     | `Lens.compose(inner)`      |
| Lens       | Traversal  | **Traversal** | `Lens.compose(inner)`      |
| Prism      | Prism      | **Prism**     | `Prism.compose(inner)`     |
| Prism      | Lens       | **Prism**     | `Prism.compose(inner)`     |
| Prism      | Traversal  | **Traversal** | `Prism.compose(inner)`     |
| Traversal  | Traversal  | **Traversal** | `Traversal.compose(inner)` |
| Traversal  | Lens       | **Traversal** | `Traversal.compose(inner)` |
| Traversal  | Prism      | **Traversal** | `Traversal.compose(inner)` |

## Cómo funciona: `compose` es pipe-friendly

El optic externo (from) fluye por el pipe, y el optic interno (to) es el argumento de `compose`:

```ts
// pipe(from, Module.compose(to))
const result = pipe(outerOptic, Module.compose(innerOptic));
```

La función `compose` de cada módulo inspecciona `to.tag` en runtime para construir el resultado correcto.

## Ejemplos de composición cruzada

### Lens + Prism = Prism

El Lens penetra hasta A (siempre tiene éxito), luego el Prism intenta extraer B de A (puede fallar).

```ts
interface User {
  name: string;
  email: Maybe<string>;
  scores: number[];
}

// User → email (Lens, siempre existe) → string dentro de Maybe (Prism, puede fallar)
const emailLens = pipe(Lens.identity<User>(), Lens.prop("email"));
const justPrism = Prism._just<string>();
const userEmail = pipe(emailLens, Lens.compose(justPrism));
// Tipo: Prism<User, string>

pipe(userEmail, Prism.preview(alice)); // => Just("alice@example.com")
pipe(userEmail, Prism.preview(bob));   // => Nothing (bob no tiene email)
```

**Patrón:** "El campo existe, pero su contenido podría no."

### Lens + Traversal = Traversal

El Lens enfoca un campo, luego el Traversal itera sobre sus elementos.

```ts
// User → scores (Lens) → cada número (Traversal)
const scoresLens = pipe(Lens.identity<User>(), Lens.prop("scores"));
const eachScore = Traversal.each<number>();
const allScores = pipe(scoresLens, Lens.compose(eachScore));
// Tipo: Traversal<User, number>

pipe(allScores, Traversal.collect(alice)); // => [85, 92, 78]

const updated = pipe(allScores, Traversal.modify(n => n + 5))(alice);
updated.scores;  // => [90, 97, 83]
updated.name;    // => "Alice" — los demás campos quedan intactos
```

**Patrón:** "Ve al campo X, luego itera sobre todos sus elementos."

### Prism + Lens = Prism

El Prism intenta extraer A (puede fallar), luego el Lens penetra dentro de A.

```ts
// Either<string, { level: number; title: string }> → { level, title } (Prism) → level (Lens)
const rightPrism = Prism._right<string, { level: number; title: string }>();
const levelLens = pipe(Lens.identity<{ level: number; title: string }>(), Lens.prop("level"));
const roleLevel = pipe(rightPrism, Prism.compose(levelLens));
// Tipo: Prism<Either<string, { level: number; title: string }>, number>

pipe(roleLevel, Prism.preview(E.right({ level: 3, title: "Senior" }))); // => Just(3)
pipe(roleLevel, Prism.preview(E.left("pending")));                       // => Nothing
```

**Patrón:** "Si es la variante correcta, accede a este campo interno."

### Prism + Traversal = Traversal

El Prism intenta extraer A. Si tiene éxito, el Traversal itera sobre los elementos de A. Si falla, hay cero focos.

```ts
// Maybe<number[]> → number[] (Prism) → cada número (Traversal)
const justPrism = Prism._just<number[]>();
const eachNum = Traversal.each<number>();
const maybeNums = pipe(justPrism, Prism.compose(eachNum));
// Tipo: Traversal<Maybe<number[]>, number>

pipe(maybeNums, Traversal.collect(M.just([1, 2, 3]))); // => [1, 2, 3]
pipe(maybeNums, Traversal.collect(M.nothing()));        // => [] (cero focos)

pipe(maybeNums, Traversal.modify(n => n * 10))(M.just([1, 2, 3]));
// => Just([10, 20, 30])

pipe(maybeNums, Traversal.modify(n => n * 10))(M.nothing());
// => Nothing (sin cambios)
```

**Patrón:** "Si el contenedor tiene algo, itera sobre sus elementos."

### Traversal + Lens = Traversal

El Traversal itera sobre todos los A's, luego el Lens accede a un campo B dentro de cada A.

```ts
// User[] → cada User (Traversal) → name (Lens)
const eachUser = Traversal.each<User>();
const nameLens = pipe(Lens.identity<User>(), Lens.prop("name"));
const allNames = pipe(eachUser, Traversal.compose(nameLens));
// Tipo: Traversal<User[], string>

const users = [alice, bob];

pipe(allNames, Traversal.collect(users)); // => ["Alice", "Bob"]

const result = pipe(allNames, Traversal.modify(s => s.toUpperCase()))(users);
result[0].name; // => "ALICE"
result[1].name; // => "BOB"
result[0].age;  // => 30 — otros campos intactos
```

**Patrón:** "Para cada elemento, accede a este campo."

### Traversal + Prism = Traversal

El Traversal itera, el Prism filtra: solo los focos donde el Prism tiene éxito se incluyen.

```ts
// Maybe<number>[] → cada Maybe (Traversal) → número dentro de Just (Prism)
const eachMaybe = Traversal.each<Maybe<number>>();
const justPrism = Prism._just<number>();
const justValues = pipe(eachMaybe, Traversal.compose(justPrism));
// Tipo: Traversal<Maybe<number>[], number>

const data = [M.just(1), M.nothing(), M.just(3), M.nothing(), M.just(5)];

pipe(justValues, Traversal.collect(data)); // => [1, 3, 5] (solo los Just)

pipe(justValues, Traversal.modify(n => n * 10))(data);
// => [Just(10), Nothing, Just(30), Nothing, Just(50)]
// Los Nothing quedan intactos
```

**Patrón:** "Para cada elemento, si cumple la condición, modifícalo."

## Escenario real: composición profunda mixta

```ts
interface User {
  name: string;
  age: number;
  email: Maybe<string>;
  scores: number[];
  role: Either<string, { level: number; title: string }>;
}
```

### Obtener el primer score de cada usuario

```ts
// User[] → cada User (Traversal)
//       → scores (Lens)
//       → primer elemento (Prism, puede no existir)
const eachUser = Traversal.each<User>();
const scoresLens = pipe(Lens.identity<User>(), Lens.prop("scores"));
const firstScore = Prism.index<number>(0);

// Traversal + Lens = Traversal<User[], number[]>
const eachUsersScores = pipe(eachUser, Traversal.compose(scoresLens));

// Traversal + Prism = Traversal<User[], number>
const eachUsersFirstScore = pipe(eachUsersScores, Traversal.compose(firstScore));

const users = [alice, bob, { ...alice, scores: [] }];

pipe(eachUsersFirstScore, Traversal.collect(users));
// => [85, 60]  — el tercer usuario no tiene scores, se omite

pipe(eachUsersFirstScore, Traversal.modify(n => n + 10))([alice, bob]);
// alice.scores => [95, 92, 78]  — solo el primer score cambió (+10)
// bob.scores   => [70, 70]      — solo el primer score cambió (+10)
```

### Modificar todos los scores de un usuario

```ts
const userScores = pipe(scoresLens, Lens.compose(Traversal.each<number>()));

const curved = pipe(userScores, Traversal.modify(n => Math.min(100, n + 5)))(alice);
curved.scores; // => [90, 97, 83]
curved.name;   // => "Alice" — sin cambios
```

### Acceder al email (Lens + Prism)

```ts
const emailLens = pipe(Lens.identity<User>(), Lens.prop("email"));
const justPrism = Prism._just<string>();
const userEmailStr = pipe(emailLens, Lens.compose(justPrism));

pipe(userEmailStr, Prism.preview(alice)); // => Just("alice@example.com")
pipe(userEmailStr, Prism.preview(bob));   // => Nothing
```

## El helper interno: `prismModify`

Exportado desde `prism.ts`, es usado por las funciones `compose` de otros módulos para derivar `modify` de un Prism, respetando el override cuando existe:

```ts
const prismModify = <S, A>(prism: Prism<S, A>) =>
  prism.modify ??
  ((f: (a: A) => A) => (s: S): S => {
    const ma = prism.preview(s);
    if (M.isNothing(ma)) return s;
    return prism.review(f(ma.value));
  });
```

Esto es importante para Prisms como `index`, donde el `modify` por defecto (preview → f → review) perdería el contexto del array.

## Verificación de leyes

Todas las composiciones cruzadas preservan las leyes del tipo resultado:

**Para Prisms (resultado de Lens+Prism, Prism+Lens):**
```ts
// PreviewReview
pipe(composed, Prism.preview(pipe(composed, Prism.review(a))));
// => Just(a)
```

**Para Traversals (resultado de cualquier composición con Traversal):**
```ts
// Identity
pipe(composed, Traversal.modify(x => x))(s); // => s

// Composition
pipe(composed, Traversal.modify(f))(pipe(composed, Traversal.modify(g))(s));
// === pipe(composed, Traversal.modify(x => f(g(x))))(s)
```

## Resumen visual

```
             Iso ──────────┐
              │             │
              │    compose por tag
              ▼             ▼
             Lens ─────┐
              │         │
   Lens.compose    Lens.compose
   (Prism)         (Traversal)
              │         │
              ▼         ▼
Prism ──────────── Traversal
  │                   ▲  ▲
  │         ┌─────────┘  │
  Prism.compose     Traversal.compose
  (Lens)            (Lens)
  │                      │
  Prism.compose     Traversal.compose
  (Traversal)       (Prism)
  │                      │
  └──────────────────────┘
```

Todas las flechas apuntan hacia abajo en la jerarquía: siempre hacia el tipo más débil.

| Módulo       | `compose` acepta         | Resultado posible    |
|--------------|--------------------------|----------------------|
| `Iso`        | Iso, Lens, Prism, Traversal | Iso, Lens, Prism, Traversal |
| `Lens`       | Lens, Prism, Traversal   | Lens, Prism, Traversal |
| `Prism`      | Prism, Lens, Traversal   | Prism, Traversal     |
| `Traversal`  | Traversal, Lens, Prism   | Traversal            |

---

**Anterior:** [Traversal](./05-traversal.md) — Múltiples focos
