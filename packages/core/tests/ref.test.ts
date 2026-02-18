/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect } from "vitest";
import {
	newRef,
	withRef,
	readRef,
	writeRef,
	modifyRef,
	swapRefs,
	prop,
	index,
	compose,
	identity,
} from "../lib/ref";
import { run } from "../lib/io";

describe("Ref", () => {
	describe("Basic operations", () => {
		it("should create a ref with initial value", () => {
			const ref = run(newRef(42));
			const value = run(ref.read);
			expect(value).toBe(42);
		});

		it("should write and read values", () => {
			const ref = run(newRef(0));
			run(ref.write(100));
			const value = run(ref.read);
			expect(value).toBe(100);
		});

		it("should modify values", () => {
			const ref = run(newRef(10));
			const newValue = run(ref.modify((x) => x * 2));
			expect(newValue).toBe(20);
			expect(run(ref.read)).toBe(20);
		});

		it("should update values and return computed result", () => {
			const ref = run(newRef(5));
			const result = run(ref.update((x) => [x + 1, x * x]));
			expect(result).toBe(25); // 5 * 5
			expect(run(ref.read)).toBe(6); // 5 + 1
		});

		it("should work with convenience functions", () => {
			const ref = run(newRef(1));
			writeRef(ref, 10);
			expect(readRef(ref)).toBe(10);

			const doubled = modifyRef(ref, (x) => x * 2);
			expect(doubled).toBe(20);
			expect(readRef(ref)).toBe(20);
		});
	});

	describe("withRef", () => {
		it("should provide a temporary ref for computation", () => {
			const result = run(
				withRef(0)((ref) => () => {
					run(ref.write(42));
					return run(ref.read);
				}),
			);
			expect(result).toBe(42);
		});
	});

	describe("swapRefs", () => {
		it("should swap values between two refs", () => {
			const ref1 = run(newRef("hello"));
			const ref2 = run(newRef("world"));

			run(swapRefs(ref1, ref2));

			expect(run(ref1.read)).toBe("world");
			expect(run(ref2.read)).toBe("hello");
		});
	});

	describe("Lenses", () => {
		interface Person {
			name: string;
			age: number;
			address: {
				street: string;
				city: string;
			};
		}

		const initialPerson: Person = {
			name: "John",
			age: 30,
			address: {
				street: "123 Main St",
				city: "New York",
			},
		};

		describe("prop lens", () => {
			it("should view property values", () => {
				const ref = run(newRef(initialPerson));
				const name = run(ref.view(prop("name")));
				const age = run(ref.view(prop("age")));

				expect(name).toBe("John");
				expect(age).toBe(30);
			});

			it("should work with focused refs", () => {
				const ref = run(newRef(initialPerson));
				const nameRef = ref.focus(prop("name"));

				expect(run(nameRef.read)).toBe("John");

				run(nameRef.write("Jane"));
				expect(run(nameRef.read)).toBe("Jane");
				expect(run(ref.read).name).toBe("Jane");
			});
		});

		describe("composed lenses", () => {
			it("should access nested properties", () => {
				const ref = run(newRef(initialPerson));

				// Create explicit lens for address.street
				const addressLens = prop<Person, "address">("address");
				const streetLens = prop<Person["address"], "street">("street");
				const addressStreetLens = compose(addressLens, streetLens);

				const street = run(ref.view(addressStreetLens));
				expect(street).toBe("123 Main St");

				// Test focused ref with composed lens
				const streetRef = ref.focus(addressStreetLens);
				run(streetRef.write("456 Oak Ave"));

				expect(run(streetRef.read)).toBe("456 Oak Ave");
				expect(run(ref.read).address.street).toBe("456 Oak Ave");
				// Original city should remain unchanged
				expect(run(ref.read).address.city).toBe("New York");
			});
		});

		describe("index lens", () => {
			it("should access array elements", () => {
				const ref = run(newRef([1, 2, 3, 4, 5]));
				const secondElement = run(ref.view(index(1)));
				expect(secondElement).toBe(2);

				// Test focused ref on array index
				const secondRef = ref.focus(index(1));
				run(secondRef.write(20));

				expect(run(secondRef.read)).toBe(20);
				expect(run(ref.read)).toEqual([1, 20, 3, 4, 5]);
			});

			it("should handle out of bounds indices", () => {
				const ref = run(newRef([1, 2, 3]));
				const outOfBounds = run(ref.view(index(10)));
				expect(outOfBounds).toBeUndefined();
			});

			it("should remove elements when setting undefined", () => {
				const ref = run(newRef([1, 2, 3, 4, 5]));
				const secondRef = ref.focus(index(1));
				run(secondRef.write(undefined));

				expect(run(ref.read)).toEqual([1, 3, 4, 5]);
			});
		});

		describe("identity lens", () => {
			it("should work as identity transformation", () => {
				const ref = run(newRef(42));
				const identityRef = ref.focus(identity<number>());

				expect(run(identityRef.read)).toBe(42);
				run(identityRef.write(100));
				expect(run(ref.read)).toBe(100);
			});
		});

		describe("complex lens compositions", () => {
			it("should handle arrays and objects", () => {
				const data = {
					items: ["first", "second", "third"],
					metadata: { count: 3 },
				};

				const ref = run(newRef(data));

				// Access first item
				const itemsLens = prop<typeof data, "items">("items");
				const firstItemLens = compose(itemsLens, index<string>(0));

				const firstItem = run(ref.view(firstItemLens));
				expect(firstItem).toBe("first");

				// Modify through focused ref
				const firstItemRef = ref.focus(firstItemLens);
				run(firstItemRef.write("FIRST"));

				expect(run(firstItemRef.read)).toBe("FIRST");
				expect(run(ref.read).items[0]).toBe("FIRST");
				expect(run(ref.read).items[1]).toBe("second"); // unchanged
			});
		});

		describe("lens chaining", () => {
			it("should allow chaining focused refs", () => {
				const ref = run(newRef(initialPerson));
				const addressRef = ref.focus(prop("address"));
				const streetRef = addressRef.focus(prop("street"));

				expect(run(streetRef.read)).toBe("123 Main St");

				run(streetRef.modify((street) => street.toUpperCase()));
				expect(run(streetRef.read)).toBe("123 MAIN ST");
				expect(run(ref.read).address.street).toBe("123 MAIN ST");
			});
		});
	});

	describe("Error handling", () => {
		it("should handle undefined lens access gracefully", () => {
			const ref = run(newRef({ value: undefined as string | undefined }));
			const valueRef = ref.focus(prop("value"));

			expect(run(valueRef.read)).toBeUndefined();
			run(valueRef.write("test"));
			expect(run(valueRef.read)).toBe("test");
		});
	});

	describe("Thread safety simulation", () => {
		it("should maintain consistency with rapid modifications", () => {
			const ref = run(newRef(0));

			// Simulate rapid increments
			for (let i = 0; i < 100; i++) {
				run(ref.modify((x) => x + 1));
			}

			expect(run(ref.read)).toBe(100);
		});
	});
});
