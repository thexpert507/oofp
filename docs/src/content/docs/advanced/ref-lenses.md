---
title: "Ref & Lenses"
description: "Mutable references with Lens-based focusing."
---

`Ref` provides functional mutable references — mutable state wrapped in `IO` so that all reads and writes are explicit, composable, and testable. Lenses let you focus a `Ref` on a specific part of its value.

```typescript
import {
  newRef, withRef,
  readRef, writeRef, modifyRef, swapRefs,
  prop, index, compose, identity,
  type Ref, type Lens,
} from "@oofp/core/ref";
```

---

## Ref Interface

A `Ref<A>` encapsulates a mutable value of type `A`, exposing all operations as `IO` computations.

```typescript
interface Ref<A> {
  read: IO<A>;                            // read the current value
  write: (value: A) => IO<void>;          // overwrite with a new value
  modify: (f: (a: A) => A) => IO<A>;     // apply a function, return the new value
  update: <B>(f: (a: A) => [A, B]) => IO<B>; // modify and extract a derived value
  view: <B>(lens: Lens<A, B>) => IO<B>;   // read a focused part via lens
  focus: <B>(lens: Lens<A, B>) => Ref<B>; // create a sub-ref via lens
}
```

Because everything returns `IO` (a thunk `() => A`), nothing executes until you call the result. This keeps your code referentially transparent until the moment you choose to run it.

---

## Creating Refs

### newRef

Creates a new `Ref` with an initial value. Returns `IO<Ref<A>>`.

```typescript
import { newRef } from "@oofp/core/ref";

const ref = newRef(0)(); // IO<Ref<number>> executed immediately

ref.read();              // 0
ref.write(42)();
ref.read();              // 42
ref.modify((n) => n + 1)(); // 43
ref.read();              // 43
```

### withRef

Creates a scoped `Ref` for a computation. The ref is created, passed to your function, and the result is returned.

```typescript
import { withRef } from "@oofp/core/ref";

const result = withRef(0)((ref) => () => {
  ref.modify((n) => n + 10)();
  ref.modify((n) => n * 2)();
  return ref.read();
})();
// result: 20
```

---

## Convenience Functions

These execute the `IO` immediately — they take the `Ref` as the first argument (not curried).

```typescript
import { readRef, writeRef, modifyRef, swapRefs } from "@oofp/core/ref";

const ref = newRef({ count: 0, label: "clicks" })();

// Read
const value = readRef(ref);          // { count: 0, label: "clicks" }

// Write
writeRef(ref, { count: 5, label: "clicks" });

// Modify
const newValue = modifyRef(ref, (s) => ({ ...s, count: s.count + 1 }));
// { count: 6, label: "clicks" }

// Swap two refs
const ref1 = newRef("A")();
const ref2 = newRef("B")();
swapRefs(ref1, ref2)();
readRef(ref1); // "B"
readRef(ref2); // "A"
```

---

## Lens Type

A `Lens<S, A>` provides read/write access to a part `A` within a whole `S`:

```typescript
interface Lens<S, A> {
  get: (s: S) => A;
  set: (value: A) => (s: S) => S;
}
```

Lenses are pure — `set` returns a **new** `S` without mutating the original.

---

## Lens Combinators

### prop

Creates a lens for a specific property of an object.

```typescript
import { prop } from "@oofp/core/ref";

interface User {
  name: string;
  age: number;
  address: { city: string; zip: string };
}

const nameLens = prop<User, "name">("name");

nameLens.get({ name: "Alice", age: 30, address: { city: "NYC", zip: "10001" } });
// "Alice"

nameLens.set("Bob")({ name: "Alice", age: 30, address: { city: "NYC", zip: "10001" } });
// { name: "Bob", age: 30, address: { city: "NYC", zip: "10001" } }
```

### index

Creates a lens for a specific index in an array.

```typescript
import { index } from "@oofp/core/ref";

const secondItem = index<string>(1);

secondItem.get(["a", "b", "c"]);
// "b"

secondItem.set("B")(["a", "b", "c"]);
// ["a", "B", "c"]

secondItem.set(undefined)(["a", "b", "c"]);
// ["a", "c"]  — setting undefined removes the element
```

### compose

Composes two lenses to access nested structures.

```typescript
import { prop, compose } from "@oofp/core/ref";

interface User {
  address: { city: string; zip: string };
}

const addressLens = prop<User, "address">("address");
const cityLens = prop<{ city: string; zip: string }, "city">("city");

const userCityLens = compose(addressLens, cityLens);

userCityLens.get({ address: { city: "NYC", zip: "10001" } });
// "NYC"

userCityLens.set("LA")({ address: { city: "NYC", zip: "10001" } });
// { address: { city: "LA", zip: "10001" } }
```

### identity

A lens that focuses on the whole value (no-op lens). Useful as a base case in compositions.

```typescript
import { identity } from "@oofp/core/ref";

const idLens = identity<number>();
idLens.get(42);        // 42
idLens.set(100)(42);   // 100
```

---

## Focusing Refs with Lenses

The real power comes from combining `Ref` and `Lens`. `ref.focus(lens)` creates a **derived Ref** that reads and writes a specific part of the parent Ref's value.

```typescript
import { newRef, prop, compose } from "@oofp/core/ref";

interface AppState {
  user: {
    name: string;
    preferences: { theme: "light" | "dark"; lang: string };
  };
  count: number;
}

const stateRef = newRef<AppState>({
  user: {
    name: "Alice",
    preferences: { theme: "light", lang: "en" },
  },
  count: 0,
})();

// Focus on nested parts
const userRef = stateRef.focus(prop<AppState, "user">("user"));
const countRef = stateRef.focus(prop<AppState, "count">("count"));

const prefsLens = compose(
  prop<AppState, "user">("user"),
  prop<AppState["user"], "preferences">("preferences"),
);
const prefsRef = stateRef.focus(prefsLens);

const themeLens = compose(
  prefsLens,
  prop<AppState["user"]["preferences"], "theme">("theme"),
);
const themeRef = stateRef.focus(themeLens);

// Read focused values
themeRef.read();  // "light"
countRef.read();  // 0

// Write to focused ref — updates the parent automatically
themeRef.write("dark")();
stateRef.read();
// { user: { name: "Alice", preferences: { theme: "dark", lang: "en" } }, count: 0 }

// Modify focused ref
countRef.modify((n) => n + 1)();
stateRef.read();
// { user: { ... }, count: 1 }
```

Changes to a focused ref propagate up to the parent ref. Reading from a focused ref always reads from the parent and applies the lens.

---

## Practical Example: Counter with History

```typescript
import { newRef, prop, withRef } from "@oofp/core/ref";

interface CounterState {
  value: number;
  history: number[];
}

const counter = withRef<CounterState, string>({
  value: 0,
  history: [],
})((ref) => () => {
  const valueRef = ref.focus(prop<CounterState, "value">("value"));

  // Increment and record history
  const increment = () => {
    const current = ref.read();
    ref.write({
      value: current.value + 1,
      history: [...current.history, current.value],
    })();
  };

  increment();
  increment();
  increment();

  const state = ref.read();
  return `Value: ${state.value}, History: [${state.history.join(", ")}]`;
})();
// "Value: 3, History: [0, 1, 2]"
```

---

## update

The `update` method on `Ref` lets you modify the value and extract a derived result in one step:

```typescript
const ref = newRef<number[]>([1, 2, 3])();

// Pop the last element
const popped = ref.update((arr) => {
  const last = arr[arr.length - 1];
  return [arr.slice(0, -1), last];
})();
// popped: 3
// ref.read(): [1, 2]
```
