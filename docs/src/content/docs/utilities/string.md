---
title: "String"
description: "Comprehensive functions for string manipulation, validation, and case conversion."
---

The String module provides curried, pipe-friendly functions for working with strings. Every function is pure — the original string is never modified.

```typescript
import * as Str from "@oofp/core/string";
```

---

## Manipulation

### trim / trimStart / trimEnd

Remove whitespace from both sides, the start, or the end.

```typescript
import { pipe } from "@oofp/core/pipe";
import * as Str from "@oofp/core/string";

pipe("  hello  ", Str.trim);       // "hello"
pipe("  hello  ", Str.trimStart);  // "hello  "
pipe("  hello  ", Str.trimEnd);    // "  hello"
```

### padStart / padEnd

Pads a string to a target length from the start or end.

```typescript
pipe("42", Str.padStart(5, "0"));   // "00042"
pipe("42", Str.padEnd(5, "."));     // "42..."
pipe("hello", Str.padStart(5));     // "hello" — already long enough
```

### repeat

Repeats a string a given number of times.

```typescript
pipe("ha", Str.repeat(3));  // "hahaha"
pipe("-", Str.repeat(10));   // "----------"
```

### replace / replaceAll

Replace the first occurrence, or all occurrences, of a pattern.

```typescript
pipe("hello world", Str.replace("world", "there"));
// "hello there"

pipe("aabaa", Str.replaceAll("a", "x"));
// "xxbxx"

// Also works with RegExp:
pipe("hello 123 world 456", Str.replaceAll(/\d+/g, "#"));
// "hello # world #"
```

### slice / substring

Extract portions of a string by index.

```typescript
pipe("hello world", Str.slice(0, 5));     // "hello"
pipe("hello world", Str.substring(6));     // "world"
pipe("hello world", Str.slice(-5));        // "world"
```

### split

Splits a string into an array by a separator.

```typescript
pipe("a,b,c", Str.split(","));
// ["a", "b", "c"]

pipe("hello world", Str.split(" "));
// ["hello", "world"]

// With limit:
pipe("a-b-c-d", Str.split("-", 2));
// ["a", "b"]
```

### concat

Concatenates additional strings onto the piped string.

```typescript
pipe("hello", Str.concat(" ", "world", "!"));
// "hello world!"
```

### reverse

Reverses a string.

```typescript
pipe("hello", Str.reverse);  // "olleh"
pipe("abcde", Str.reverse);  // "edcba"
```

### truncate

Truncates a string to a maximum length, appending a suffix (default `"..."`).

```typescript
pipe("This is a long string", Str.truncate(10));
// "This is..."

pipe("This is a long string", Str.truncate(10, "~"));
// "This is a~"

pipe("Short", Str.truncate(10));
// "Short" — not truncated
```

### insert

Inserts a substring at a given index.

```typescript
pipe("hello", Str.insert(2, "XX"));
// "heXXllo"
```

### remove

Removes characters from a given start position and length.

```typescript
pipe("hello", Str.remove(1, 2));
// "hlo"
```

### takeLeft / takeRight

Takes characters from the left or right.

```typescript
pipe("hello", Str.takeLeft(3));   // "hel"
pipe("hello", Str.takeRight(3));  // "llo"
```

### dropLeft / dropRight

Drops characters from the left or right.

```typescript
pipe("hello", Str.dropLeft(2));   // "llo"
pipe("hello", Str.dropRight(2));  // "hel"
```

---

## Case Conversion

### toUpperCase / toLowerCase

```typescript
pipe("Hello World", Str.toUpperCase);  // "HELLO WORLD"
pipe("Hello World", Str.toLowerCase);  // "hello world"
```

### capitalize / uncapitalize

Capitalize or uncapitalize the first character.

```typescript
pipe("hello world", Str.capitalize);    // "Hello world"
pipe("Hello World", Str.uncapitalize);  // "hello World"
```

### camelCase

Converts to camelCase from any separator (spaces, hyphens, underscores).

```typescript
pipe("hello world", Str.camelCase);    // "helloWorld"
pipe("hello-world", Str.camelCase);    // "helloWorld"
pipe("hello_world", Str.camelCase);    // "helloWorld"
pipe("HelloWorld", Str.camelCase);     // "helloWorld"
```

### pascalCase

Converts to PascalCase.

```typescript
pipe("hello world", Str.pascalCase);   // "HelloWorld"
pipe("hello-world", Str.pascalCase);   // "HelloWorld"
```

### kebabCase

Converts to kebab-case.

```typescript
pipe("HelloWorld", Str.kebabCase);     // "hello-world"
pipe("hello world", Str.kebabCase);    // "hello-world"
pipe("hello_world", Str.kebabCase);    // "hello-world"
```

### snakeCase

Converts to snake_case.

```typescript
pipe("HelloWorld", Str.snakeCase);     // "hello_world"
pipe("hello world", Str.snakeCase);    // "hello_world"
pipe("hello-world", Str.snakeCase);    // "hello_world"
```

### slugify

Creates a URL-friendly slug: removes accents, lowercases, replaces non-alphanumeric characters with hyphens.

```typescript
pipe("Hello, World! Cafe", Str.slugify);
// "hello-world-cafe"

pipe("Functional Programming 101", Str.slugify);
// "functional-programming-101"
```

---

## Validation

### startsWith / endsWith / includes

Check if a string starts with, ends with, or contains a substring.

```typescript
pipe("hello world", Str.startsWith("hello"));  // true
pipe("hello world", Str.endsWith("world"));     // true
pipe("hello world", Str.includes("lo wo"));     // true
```

### match / matchAll

Pattern matching with regular expressions.

```typescript
pipe("hello 123", Str.match(/\d+/));
// RegExpMatchArray: ["123"]

pipe("a1 b2 c3", Str.matchAll(/[a-z]\d/g));
// IterableIterator of matches
```

### isEmpty / isBlank

```typescript
Str.isEmpty("");       // true
Str.isEmpty("hello");  // false

Str.isBlank("");       // true
Str.isBlank("   ");   // true
Str.isBlank("hello"); // false
```

### isAlpha / isAlphaNumeric / isNumeric

```typescript
Str.isAlpha("hello");      // true
Str.isAlpha("hello123");   // false

Str.isAlphaNumeric("hello123");   // true
Str.isAlphaNumeric("hello-123");  // false

Str.isNumeric("12345");   // true
Str.isNumeric("123abc");  // false
```

### isEmail

Basic email format validation.

```typescript
Str.isEmail("user@example.com");  // true
Str.isEmail("invalid-email");     // false
```

### isUrl

Validates a URL using the `URL` constructor.

```typescript
Str.isUrl("https://example.com");  // true
Str.isUrl("not-a-url");           // false
```

---

## HTML

### escapeHtml / unescapeHtml

Escape and unescape HTML special characters (`&`, `<`, `>`, `"`, `'`).

```typescript
pipe("<div>Hello & goodbye</div>", Str.escapeHtml);
// "&lt;div&gt;Hello &amp; goodbye&lt;/div&gt;"

pipe("&lt;div&gt;Hello &amp; goodbye&lt;/div&gt;", Str.unescapeHtml);
// "<div>Hello & goodbye</div>"
```

---

## Character & Index Operations

### length

Returns the length of a string.

```typescript
Str.length("hello");  // 5
Str.length("");        // 0
```

### charAt / charCodeAt

Access individual characters or their codes.

```typescript
pipe("hello", Str.charAt(1));      // "e"
pipe("hello", Str.charCodeAt(0));  // 104
```

### indexOf / lastIndexOf

Find the position of a substring.

```typescript
pipe("hello world", Str.indexOf("o"));       // 4
pipe("hello world", Str.lastIndexOf("o"));   // 7
pipe("hello world", Str.indexOf("xyz"));     // -1
```

---

## Splitting & Joining

### words

Extracts words (sequences of word characters) from a string.

```typescript
Str.words("hello world test");
// ["hello", "world", "test"]

Str.words("camelCase is-fun");
// ["camelCase", "is", "fun"]
```

### lines

Splits a string by line breaks (`\n`, `\r`, `\r\n`).

```typescript
Str.lines("line1\nline2\rline3\r\nline4");
// ["line1", "line2", "line3", "line4"]
```

### unlines

Joins an array of strings with newline characters.

```typescript
Str.unlines(["line1", "line2", "line3"]);
// "line1\nline2\nline3"
```

---

## Functional Operations

### map

Transforms each character of a string.

```typescript
pipe("hello", Str.map((char) => char.toUpperCase()));
// "HELLO"
```

### tap

Executes a side effect on the string without modifying it.

```typescript
pipe(
  "hello",
  Str.tap((s) => console.log(`Processing: ${s}`)),
  Str.toUpperCase,
);
// Logs: "Processing: hello"
// Result: "HELLO"
```

### filter

Keeps only characters that satisfy a predicate.

```typescript
pipe("hello123", Str.filter((c) => Str.isAlpha(c)));
// "hello"

pipe("h-e-l-l-o", Str.filter((c) => c !== "-"));
// "hello"
```

### find

Returns the first character that satisfies a predicate, or `undefined`.

```typescript
pipe("hello", Str.find((c) => c === "l"));  // "l"
pipe("hello", Str.find((c) => c === "z"));  // undefined
```

### every / some

Check if all or any characters satisfy a predicate.

```typescript
pipe("aaa", Str.every((c) => c === "a"));  // true
pipe("abc", Str.every((c) => c === "a"));  // false

pipe("abc", Str.some((c) => c === "b"));   // true
pipe("abc", Str.some((c) => c === "z"));   // false
```

---

## Comparison

### equals / equalsIgnoreCase

```typescript
Str.equals("hello")("hello");               // true
Str.equals("hello")("Hello");               // false

Str.equalsIgnoreCase("hello")("Hello");     // true
Str.equalsIgnoreCase("hello")("world");     // false
```

---

## Other Utilities

### count

Counts occurrences of a substring.

```typescript
pipe("hello world hello", Str.count("hello"));  // 2
pipe("aaa", Str.count("aa"));                    // 1
```

### removeAccents

Removes diacritical marks (accents) from characters.

```typescript
Str.removeAccents("cafe");    // "cafe"
Str.removeAccents("resume");  // "resume"
```

### search

Returns the index of the first match for a regex, or `-1`.

```typescript
pipe("hello 123", Str.search(/\d+/));   // 6
pipe("hello world", Str.search(/\d+/)); // -1
```

### ellipsis

Shortcut for `truncate` with the `"..."` suffix.

```typescript
pipe("This is a long string", Str.ellipsis(10));
// "This is..."
```

---

## Practical Examples

### Input sanitization pipeline

```typescript
import { pipe } from "@oofp/core/pipe";
import * as Str from "@oofp/core/string";

const sanitizeInput = (input: string) =>
  pipe(
    input,
    Str.trim,
    Str.replaceAll(/\s+/g, " "),
    Str.escapeHtml,
    Str.truncate(200),
  );

sanitizeInput("  <script>alert('xss')</script>  Hello   World  ");
// "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;  Hello World"
```

### Generating URL slugs

```typescript
import { pipe } from "@oofp/core/pipe";
import * as Str from "@oofp/core/string";

const createSlug = (title: string) =>
  pipe(title, Str.slugify);

createSlug("Functional Programming in TypeScript!");
// "functional-programming-in-typescript"
```

### CSV parsing

```typescript
import { pipe } from "@oofp/core/pipe";
import * as Str from "@oofp/core/string";
import * as L from "@oofp/core/list";

const parseCSV = (csv: string) =>
  pipe(
    csv,
    Str.lines,
    L.map(Str.split(",")),
    L.map(L.map(Str.trim)),
  );

parseCSV("name, age\nAlice, 30\nBob, 25");
// [["name", "age"], ["Alice", "30"], ["Bob", "25"]]
```

### Case conversion pipeline

```typescript
import { pipe } from "@oofp/core/pipe";
import * as Str from "@oofp/core/string";

// Database column → TypeScript property
const toProperty = (column: string) =>
  pipe(column, Str.camelCase);

toProperty("user_name");    // "userName"
toProperty("created_at");   // "createdAt"

// TypeScript property → Database column
const toColumn = (prop: string) =>
  pipe(prop, Str.snakeCase);

toColumn("userName");     // "user_name"
toColumn("createdAt");    // "created_at"
```

### Validation with pipe

```typescript
import { pipe } from "@oofp/core/pipe";
import * as Str from "@oofp/core/string";
import * as E from "@oofp/core/either";

const validateUsername = (input: string) =>
  pipe(
    input,
    Str.trim,
    (s) => Str.isEmpty(s)
      ? E.left("Username is required")
      : E.right(s),
    E.chain((s) =>
      Str.isAlphaNumeric(s)
        ? E.right(s)
        : E.left("Username must be alphanumeric"),
    ),
    E.chain((s) =>
      Str.length(s) >= 3
        ? E.right(s)
        : E.left("Username must be at least 3 characters"),
    ),
  );

validateUsername("alice123");  // Right("alice123")
validateUsername("al");        // Left("Username must be at least 3 characters")
validateUsername("al!ce");     // Left("Username must be alphanumeric")
```
