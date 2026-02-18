/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, expect, test } from "vitest";
import * as S from "../lib/string";

describe("String utilities", () => {
	describe("Basic operations", () => {
		test("map transforms each character", () => {
			const result = S.map((char) => char.toUpperCase())("hello");
			expect(result).toBe("HELLO");
		});

		test("charAt returns character at index", () => {
			const result = S.charAt(1)("hello");
			expect(result).toBe("e");
		});

		test("slice extracts substring", () => {
			const result = S.slice(1, 4)("hello");
			expect(result).toBe("ell");
		});

		test("toLowerCase converts to lowercase", () => {
			const result = S.toLowerCase("HELLO");
			expect(result).toBe("hello");
		});

		test("toUpperCase converts to uppercase", () => {
			const result = S.toUpperCase("hello");
			expect(result).toBe("HELLO");
		});

		test("trim removes whitespace", () => {
			const result = S.trim("  hello  ");
			expect(result).toBe("hello");
		});
	});

	describe("Array conversion", () => {
		test("split converts string to array", () => {
			const result = S.split(",")("a,b,c");
			expect(result).toEqual(["a", "b", "c"]);
		});

		test("lines splits by newlines", () => {
			const result = S.lines("line1\nline2\rline3\r\nline4");
			expect(result).toEqual(["line1", "line2", "line3", "line4"]);
		});

		test("words extracts words", () => {
			const result = S.words("hello world test");
			expect(result).toEqual(["hello", "world", "test"]);
		});
	});

	describe("String replacement", () => {
		test("replace replaces first occurrence", () => {
			const result = S.replace("l", "x")("hello");
			expect(result).toBe("hexlo");
		});

		test("replaceAll replaces all occurrences", () => {
			const result = S.replaceAll("l", "x")("hello");
			expect(result).toBe("hexxo");
		});

		test("replaceAll with regex", () => {
			const result = S.replaceAll(/l/g, "x")("hello");
			expect(result).toBe("hexxo");
		});
	});

	describe("String validation", () => {
		test("isEmpty checks for empty string", () => {
			expect(S.isEmpty("")).toBe(true);
			expect(S.isEmpty("hello")).toBe(false);
		});

		test("isBlank checks for blank string", () => {
			expect(S.isBlank("")).toBe(true);
			expect(S.isBlank("   ")).toBe(true);
			expect(S.isBlank("hello")).toBe(false);
		});

		test("isAlpha checks for alphabetic characters", () => {
			expect(S.isAlpha("hello")).toBe(true);
			expect(S.isAlpha("hello123")).toBe(false);
		});

		test("isNumeric checks for numeric characters", () => {
			expect(S.isNumeric("123")).toBe(true);
			expect(S.isNumeric("hello")).toBe(false);
		});

		test("isAlphaNumeric checks for alphanumeric characters", () => {
			expect(S.isAlphaNumeric("hello123")).toBe(true);
			expect(S.isAlphaNumeric("hello-123")).toBe(false);
		});

		test("isEmail checks for valid email", () => {
			expect(S.isEmail("test@example.com")).toBe(true);
			expect(S.isEmail("invalid-email")).toBe(false);
		});

		test("isUrl checks for valid URL", () => {
			expect(S.isUrl("https://example.com")).toBe(true);
			expect(S.isUrl("invalid-url")).toBe(false);
		});
	});

	describe("Case conversion", () => {
		test("capitalize capitalizes first letter", () => {
			const result = S.capitalize("hello world");
			expect(result).toBe("Hello world");
		});

		test("uncapitalize uncapitalizes first letter", () => {
			const result = S.uncapitalize("Hello World");
			expect(result).toBe("hello World");
		});

		test("camelCase converts to camel case", () => {
			expect(S.camelCase("hello world")).toBe("helloWorld");
			expect(S.camelCase("hello-world")).toBe("helloWorld");
			expect(S.camelCase("hello_world")).toBe("helloWorld");
		});

		test("pascalCase converts to pascal case", () => {
			expect(S.pascalCase("hello world")).toBe("HelloWorld");
			expect(S.pascalCase("hello-world")).toBe("HelloWorld");
		});

		test("kebabCase converts to kebab case", () => {
			expect(S.kebabCase("HelloWorld")).toBe("hello-world");
			expect(S.kebabCase("hello world")).toBe("hello-world");
		});

		test("snakeCase converts to snake case", () => {
			expect(S.snakeCase("HelloWorld")).toBe("hello_world");
			expect(S.snakeCase("hello world")).toBe("hello_world");
		});
	});

	describe("String manipulation", () => {
		test("reverse reverses string", () => {
			const result = S.reverse("hello");
			expect(result).toBe("olleh");
		});

		test("repeat repeats string", () => {
			const result = S.repeat(3)("hi");
			expect(result).toBe("hihihi");
		});

		test("concat concatenates strings", () => {
			const result = S.concat(" world", "!")("hello");
			expect(result).toBe("hello world!");
		});

		test("padStart pads at start", () => {
			const result = S.padStart(5, "0")("123");
			expect(result).toBe("00123");
		});

		test("padEnd pads at end", () => {
			const result = S.padEnd(5, "0")("123");
			expect(result).toBe("12300");
		});
	});

	describe("String truncation", () => {
		test("truncate truncates with custom suffix", () => {
			const result = S.truncate(10, "...")("This is a long string");
			expect(result).toBe("This is...");
		});

		test("ellipsis truncates with ellipsis", () => {
			const result = S.ellipsis(10)("This is a long string");
			expect(result).toBe("This is...");
		});

		test("takeLeft takes characters from left", () => {
			const result = S.takeLeft(3)("hello");
			expect(result).toBe("hel");
		});

		test("takeRight takes characters from right", () => {
			const result = S.takeRight(3)("hello");
			expect(result).toBe("llo");
		});

		test("dropLeft drops characters from left", () => {
			const result = S.dropLeft(2)("hello");
			expect(result).toBe("llo");
		});

		test("dropRight drops characters from right", () => {
			const result = S.dropRight(2)("hello");
			expect(result).toBe("hel");
		});
	});

	describe("HTML encoding", () => {
		test("escapeHtml escapes HTML characters", () => {
			const result = S.escapeHtml("<div>Hello & goodbye</div>");
			expect(result).toBe("&lt;div&gt;Hello &amp; goodbye&lt;/div&gt;");
		});

		test("unescapeHtml unescapes HTML characters", () => {
			const result = S.unescapeHtml("&lt;div&gt;Hello &amp; goodbye&lt;/div&gt;");
			expect(result).toBe("<div>Hello & goodbye</div>");
		});
	});

	describe("String utilities", () => {
		test("removeAccents removes diacritical marks", () => {
			const result = S.removeAccents("café");
			expect(result).toBe("cafe");
		});

		test("slugify creates URL-friendly slug", () => {
			const result = S.slugify("Hello, World! Café");
			expect(result).toBe("hello-world-cafe");
		});

		test("count counts substring occurrences", () => {
			const result = S.count("ll")("hello world");
			expect(result).toBe(1);
		});

		test("insert inserts substring at index", () => {
			const result = S.insert(2, "XX")("hello");
			expect(result).toBe("heXXllo");
		});

		test("remove removes characters", () => {
			const result = S.remove(1, 2)("hello");
			expect(result).toBe("hlo");
		});
	});

	describe("Functional operations", () => {
		test("filter filters characters", () => {
			const result = S.filter((char) => char !== "l")("hello");
			expect(result).toBe("heo");
		});

		test("find finds first matching character", () => {
			const result = S.find((char) => char === "l")("hello");
			expect(result).toBe("l");
		});

		test("every checks if all characters match predicate", () => {
			const result = S.every((char) => char.length === 1)("hello");
			expect(result).toBe(true);
		});

		test("some checks if any character matches predicate", () => {
			const result = S.some((char) => char === "l")("hello");
			expect(result).toBe(true);
		});
	});

	describe("String comparison", () => {
		test("equals compares strings exactly", () => {
			expect(S.equals("hello")("hello")).toBe(true);
			expect(S.equals("hello")("Hello")).toBe(false);
		});

		test("equalsIgnoreCase compares strings ignoring case", () => {
			expect(S.equalsIgnoreCase("hello")("Hello")).toBe(true);
			expect(S.equalsIgnoreCase("hello")("world")).toBe(false);
		});
	});

	describe("Search operations", () => {
		test("indexOf finds index of substring", () => {
			const result = S.indexOf("ll")("hello");
			expect(result).toBe(2);
		});

		test("includes checks if string contains substring", () => {
			expect(S.includes("ell")("hello")).toBe(true);
			expect(S.includes("xyz")("hello")).toBe(false);
		});

		test("startsWith checks if string starts with substring", () => {
			expect(S.startsWith("hel")("hello")).toBe(true);
			expect(S.startsWith("ell")("hello")).toBe(false);
		});

		test("endsWith checks if string ends with substring", () => {
			expect(S.endsWith("llo")("hello")).toBe(true);
			expect(S.endsWith("hel")("hello")).toBe(false);
		});
	});
});
